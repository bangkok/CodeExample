var CheckoutDelivery_class = CheckoutStep_class.extend({

	Class: 'CheckoutDelivery_class',

	options: {
		container_selector: '#step_delivery',
		selectors: {
			orders: '#orders',
			attention: '#attention',
			valid_block: '#orders',
			next_button: '#make-order'
		}
	},

	step_name: 'delivery',

	orders: [],

	response: null,

	init: function () {

		// елемент за пределами контейнера
		this.elems.next_button = $E(this.options.selectors.next_button);

		this.setOptions(this.checkout.options.delivery_data);

		this.parent();

		if (Object.getLength(this.options.data)) {

			this.is_wait = false;

			this.response = this.options.data;

			App.log('getOrdersData', this.response);

			this.update();

			this.fireEvent('Success');

		} else {

			this.is_wait = true;

			this.onChangeLocality(this.checkout.locality);

		}

	},

	initEvents: function () {

		this.elems.next_button && this.elems.next_button.removeEvents('click');

		this.parent();

	},

	onChangeLocality: function (locality_id) {

		if (locality_id) {

			this.getOrdersData(locality_id);

		}

	},

	/**
	 * Реакция на действие приводящие к изменению стоимости заказа.
	 */
	onChangeCost: function () {

		this.validStep();

	},

	/**
	 * Формирует запрос получения информации о заказах
	 * @param locality_id
	 */
	getOrdersData: function (locality_id) {

		var options = {
			data: {locality_id: locality_id},
			action: 'getCheckoutData',
			onComplete: function (e) {
				this.checkResp(e, locality_id);
			}.bind(this)
		};

		this.is_ready = true;

		this.is_wait = true;

		this.checkout.ajaxAction(options);

		this.showPreloader();

	},

	/**
	 * onComplete метод получения информации о заказах
	 * @param resp
	 * @param locality
	 */
	checkResp: function (resp, locality) {

		var response = new Response_class(resp);

		if (this.checkout.locality == locality && $type(resp) == 'string') {

			this.is_wait = false;

			App.log('getOrdersData', response, locality);

			if (response.isDone()) {

				this.response = response.content;

				this.update();

				if (this.checkout.cart.is_updated) {
					this.checkPurchases();
					this.checkout.getController('purchases').update();
				}

				App.log('Success');
				this.fireEvent('Success');

			} else {

				this.is_ready = false;

				App.log('Fail');
				this.fireEvent('Fail');

				response.Message && App.showMessage(response.Message);

				response.doAction();

				if (response.content && response.content.reason == "deletedCity") {
					CityChooser.resetCity();
					checkout_suggest.resetValue();
				}

			}

		}

	},

	checkPurchases: function () {
		var order_purchases = this.checkout.getController('purchases').getPurchases(),
			not_coincide_purchases = this.checkout.getNotCoincidePurchases(order_purchases);

		/*{* хак, если вдруг товары в корзине отличаются от товаров в заказе *}*/
		if (not_coincide_purchases.length) {
			App.log('NotCoincidePurchases', not_coincide_purchases);
			S.renew();
		}
	},

	/**
	 * формирование и inject всех заказов
	 */
	update: function () {

		this.orders = [];

		//this.response.orders[1].combinations = [];

		// хак. пока сервер не передает индекс в заказе
		Object.each(this.response.orders, function (order, index) {
			order.index = index;
		});

		this.checkout.data.orders = Object.values(this.response.orders).sort(function (a, b) {
			return (b.combinations.length ? 1 : 0) - (a.combinations.length ? 1 : 0);
		});

		this.onResize(true);

		this.elems.orders.empty().removeEvents();

		Object.each(this.checkout.data.orders, function (order, index, orders) {

			var order_html;

			index = Object.getLength(orders) > 1 ? index : null;

			this.orders[order.index] = new Order_class(this.checkout, order)
				.setOptions({data: {pickups: this.response.pickups}});

			order_html = this.orders[order.index].getOrderHtml(index);

			order_html.inject(this.elems.orders);

		}, this);

		this.onResize();

		this.checkout.updateTotalCost();

		this.initEvents();

		App.addOnDomReady(function () {

			$(document).fireEvent('ordersUpdated');

		}.bind(this));


		this.updateAttention();

	},

	/**
	 * Активация шага
	 */
	open: function () {
		Object.each(this.orders, function (order) {
			order.updateUserInfo();
		});

		this.parent();

		this.container.removeClass('disabled');
		this.checkout.getController('purchases').showTotal();

		var hash = location.parseHash() || {};
		hash.step = this.step_name;
		location.hash = location.createHash(hash);
	},

	/**
	 * Дизактивация шага
	 */
	close: function () {
		this.parent();
		this.container.addClass('disabled');
		this.checkout.getController('purchases').hideTotal();

		var hash = location.parseHash();
		hash && delete hash.step;
		location.hash = location.createHash(hash);
	},

	showPreloader: function (tpl) {

		if (this.orders) {
			Object.each(this.orders, function (order) {
				order.showPreloader(tpl || this.options.preloader);
			}, this);
		} else {
			this.parent(tpl);
		}

	},

	hidePreloader: function () {
		if (this.orders) {
			Object.each(this.orders, function (order) {
				order.hidePreloader();
			});
		} else {
			this.parent();
		}

	},

	/**
	 * Возвращает данные для запроса оформления заказа.
	 * @returns {*}
	 */
	getData: function (for_delivery) {
		var data = {
			order: {}
		};

		Object.each(this.orders, function (order, index) {

			if (order.comb.isAvailable()) {

				data.order[index] = {};

				Object.merge(data.order[index], for_delivery ? order.getDeliveryData() : order.getData());

			}

		});

		return Object.getLength(data.order) ? data : null;

	},

	/**
	 * обновление стоимости заказов
	 * @param content
	 * @param data
	 */
	updateCost: function (content, data) {

		this.validStep();

		Object.each(this.orders, function (order, index) {

			if (
				(!data || !$chk(data.order_index) || data.order_index == index)
					&& order.comb.isAvailable()
			) {

				order.updateCost(
					(content && content.grouped_orders) ? content.grouped_orders[index] : null,
					data ? data.order[index] : null
				);

			}

		});

	},

	/**
	 * Управляет отображением блока с важным сообщением
	 */
	updateAttention: function () {

		var available_orders_count = Object.values(this.orders).filter(function (order) {
			return order.comb.isAvailable();
		}).length;

		if (available_orders_count > 1) {
			this.elems.attention.show();
		} else {
			this.elems.attention.hide();
		}

	},

	/**
	 * Необходимо, чтоб при обновлении заказов страница не прыгнула.
	 * @param fix
	 */
	onResize: function (fix) {
		this.elems.orders.setStyle('height', '');
		fix && this.elems.orders.setStyle('height', this.elems.orders.offsetHeight + 'px');
	},

	/**
	 * Все необходимые условия шага выполнены
	 * @returns {boolean}
	 */
	isOk: function () {
		var self = this,
			isOrdersOk = function () {
				return Object.every(self.orders, function (order) {
					return order.isOk();
				});
			};

		return this.is_ready && !this.is_wait && isOrdersOk();
	}

});

var Order_class = new Class({
	Class: 'Order_class',

	options: {
		selectors: {
			purchases: {
				container: '[name="purchases"]',
				order_cost: '[name="order_cost"]'
			},
			delivery: {
				address: {
					block: '[id=delivery_address]', /*{* #elem_id ie не понимает *}*/
					select: 'select[name$="[delivery][address_id]"]',
					fields: {
						street: '[name$="[delivery][address][street]"]',
						house: '[name$="[delivery][address][house]"]',
						flat: '[name$="[delivery][address][flat]"]'
					}
				}
			},
			payment_methods: {
				credit_questionnaire_block: '[name="credit_questionnaire_block"]'
			},
			info: {
				delivery: '[name="delivery_info"]',
				payment: '[name="payment_info"]',
				is_gift_button: '[name="is_gift_button"]'
			},
			fio: {
				input: '[name$="[delivery][recipient_title]"]',
				block: '[name="recipient_title_field"]'
			},
			comment: {
				block: '[id="order-comment"]',
				show: '[name=show_orders_comment]',
				hide: '[name=hide_orders_comment]'
			},
			about_kids: {
				block: '[name="about_kids"]',
				birth_day: '[name$="[user][kid][birthday][day]"]',
				birth_year: '[name$="[user][kid][birthday][year]"]'
			},
			for_gift: {
				label: '[id=gift_label]',
				checkbox: '[id=gift_checkbox]'
			}
		},
		tpl: {
			order: '', /*{* определяется в шаблоне *}*/
			purchases: '/*{template_js_fetch file="my/checkout/_jst/order_purchases.jst" jst=1}*/',
			popup: '/*{template_js_fetch file="my/checkout/_jst/info-popup.jst" jst=1}*/',
			info: '/*{template_script_fetch file="my/checkout/_jst/info-popup-content.jst" jst=1}*/',
			payment_info: '/*{template_script_fetch file="my/checkout/_jst/payment-info-popup-content.jst" jst=1}*/',
			delivery: '/*{template_script_fetch file="my/checkout/_jst/delivery.jst" jst=1}*/',
			unavailable_goods: '/*{template_script_fetch file="my/checkout/_jst/invalid-goods.jst" jst=1}*/',
			price_limit: '/*{template_script_fetch file="my/checkout/_jst/price-limit.jst" jst=1}*/'
		},
		default_order_data: {
			checkout_type: 'site'
		},
		data: {
			pickups: null
		},
		block_toggle_effects: {
			show: [
				function (block) {
					block.element && block.element.each(function (el) {
						el = $(el) ? el : el.block;
						$(el) && new Fx.Style(el, 'opacity').start(0, 1);
					});
				}
			],
			hide: [
				function (block) {
					block.element && block.element.each(function (el) {
						el = $(el) ? el : el.block;
						$(el) && new Fx.Style(el, 'opacity').set(0);
					});
				}
			]
		}

	},

	checkout: null,

	order: null,

	container: null,

	delivery_data: null,

	blocks: null,

	comb: null,

	pickups: null,

	request: null,

	elems: null,


	initialize: function (checkout, order) {

		this.checkout = checkout;

//		order.active_delivery = order.active_payment = {};

		this.order = order;

		this.setOptions(this.checkout.options.order_data);

		this.blocks = {};

		this.comb = {};

		this.delivery_data = {};

		this.elems = null;

		this.checkout.addEvent('checkoutResponseReceived', this._onCheckoutResponse.bind(this));

	},

	getOrderHtml: function (index) {

		var data;

		this.container = new Element('div');

		this.blocks = {};

		this.comb = new Combinations(this.order.combinations, this.order.data);

		data = {
			order: this.order,
			comb: this.comb,
			index: $chk(index) ? index.toInt() + 1 : null
		};

		this.container.setHTML(App.getHTML(this.options.tpl.order, data));

		this.elems = this.initElements(this.options.selectors, this.container);

		this.checkout.cart.is_updated && this.updatePurchases();

		this.checkout.cart.addEvent('update', this.updatePurchases.bind(this));

		if (this.comb.isAvailable()) {

			this.blocks.delivery = this.updateDeliveryMethods(this.options.selectors.delivery);

			this.blocks.payments = this.updatePayments(this.options.selectors.payment_methods);

			this.onDeliveryChange();

			this.elems = this.initElements(this.options.selectors, this.container);

			this.updateInfo();

			this.updateUserInfo();

			this.updateAddress();

			this.updateComments();

			this.updateAboutKidsBlock();

			this.initItsForGift();

		}

		return this.container;

	},

	/**
	 * Выводит пурчейсы в заказе.
	 */
	updatePurchases: function () {

		var purchases = this.order.purchases.map(function (id) {
			return this.checkout.cart.getPurchase(id);
		}, this);

		$(this.elems.purchases.container).setHTML(App.getHTML(
			this.options.tpl.purchases,
			{
				purchases: purchases,
				cart: this.checkout.cart,
				order_cost: this.order.order_cost,
				orders_count: Object.getLength(this.checkout.data.orders)
			}
		));

		this.elems.purchases = this.initElements(this.options.selectors.purchases, this.container);

	},

	updateOrderCost: function () {

		if (this.elems.purchases.order_cost && this.order.order_cost) {

			this.elems.purchases.order_cost.setHTML(this.order.order_cost.cost_with_discount.primary.string);

		}

	},

	/**
	 * Оживляет табы методов доставки
	 * @param selectors
	 * @returns {*}
	 */
	updateDeliveryMethods: function (selectors) {
		var elems, delivery_methods;

		this.comb.getMD().each(function (md) {
			selectors[md.name] = '[name="' + md.name + '"]';
			selectors[md.name + '_block'] = '[name="' + md.name + '_block"]';
		});
		elems = this.initElements(selectors, this.container);

		/*{* Табы методов доставки *}*/
		delivery_methods = new ActiveBlocks_class(this.container)
			.addEvent('Show', this.onDeliveryChange.bind(this));

		this.comb.getMD().each(function (md, i) {
			delivery_methods.setBlock(
				elems[md.name + '_block'],
				elems[md.name],
				md.name,
				!i
			);
			this.blocks[md.name] = this.updateDeliveryServices(elems[md.name + '_block'], md);
		}, this);
		delivery_methods.display(this.comb.getName('md', this.order.active_delivery.method) || false)
			.setOptions({effects: this.options.block_toggle_effects});

		/*{* Открывать адрес вместе с доставкой курьером *}*/
		delivery_methods.addBlock(new SavedSpecialBlock_class(elems.address.block), 'couriers');

		return delivery_methods;

	},

	/**
	 * Оживляет сервисы доставки
	 * @param container
	 * @param md
	 * @returns {*}
	 */
	updateDeliveryServices: function (container, md) {
		var elems, delivery_services, selectors = {},
			pickups = this.options.data.pickups;

		this.comb.getSD(md).each(function (sd) {
			selectors[sd.name] = '[name="' + md.name + '_' + sd.name + '"]';
			selectors[sd.name + '_block'] = '[name="' + md.name + '_block_' + sd.name + '"]';
		});
		elems = this.initElements(selectors, container);

		delivery_services = new ActiveBlocks_class(container)
			.setOptions({stop_events: false})
			.addEvent('Show', this.onDeliveryChange.bind(this));

		this.comb.getSD(md).each(function (sd, i) {

			if (md.name == 'pickups') {
				new RozetkaPickupsSelect_class(elems[sd.name + '_block']).start(pickups[sd.id]);
			}

			delivery_services.setBlock(
				new SavedSpecialBlock_class(elems[sd.name + '_block']),
				elems[sd.name],
				sd.name,
				!i
			);
		});
		delivery_services.display(this.comb.getName('sd', this.order.active_delivery.service) || false);

		return delivery_services;

	},

	/**
	 * Оживляет табы типов оплат
	 * @param selectors
	 * @returns {*}
	 */
	updatePayments: function (selectors) {
		var elems, payments, active = 0;

		this.comb.getPT().each(function (pt) {
			selectors[pt.name] = '[name="' + pt.name + '"]';
			selectors[pt.name + '_block'] = '[name="' + pt.name + '_block"]';
		});
		elems = this.initElements(selectors, this.container);

		/*{* Табы способов оплат *}*/
		payments = new DynamicBlocks_class(this.container)
			.addEvent('Show', this.onPaymentChange.bind(this));

		this.comb.getPT().each(function (pt) {
			payments.setBlock(
				elems[pt.name + '_block'],
				elems[pt.name],
				pt.name,
				this.comb.mayBeActive('pt', pt) ? !(active++) : false
			);

			if (pt.name == 'credit') {
				this.blocks[pt.name] = this.updatePaymentMethods(elems[pt.name + '_block'], pt);

				payments.addDisplayAllowedFn(function (block) {
					return this.comb.mayBeActive('pt', block)
						|| this._showInvalidGoodsPopup(this.comb.getPM(block).shift());
				}.bind(this));
			}
		}, this);
		payments.display(this.order.active_payment.type || false)
			.setOptions({effects: this.options.block_toggle_effects});

		/*{* Открывать анкету вместе с кредитом *}*/
		payments.addBlock(new Questionnaire_class(elems.credit_questionnaire_block), 'credit');

		return payments;

	},

	/**
	 * Оживляет методы оплат
	 * @param container
	 * @param pt
	 * @returns {*}
	 */
	updatePaymentMethods: function (container, pt) {
		var elems, payment_methods, active = 0, selectors = {};

		this.comb.getPM(pt).each(function (pm) {
			selectors[pm.name] = '[name="' + pt.name + '_' + pm.name + '"]';
			selectors[pm.name + '_block'] = '[name="' + pt.name + '_block_' + pm.name + '"]';
		});
		elems = this.initElements(selectors, container);

		payment_methods = new DynamicBlocks_class(container)
			.setOptions({stop_events: false, stop_propagation_events: true})
			.addEvent('Show', this.onPaymentMethodChange.bind(this));

		this.comb.getPM(pt).each(function (pm, i) {
			payment_methods.setBlock(
				elems[pm.name + '_block'],
				elems[pm.name],
				pm.name,
				this.comb.mayBeActive('pm', pm) ? !(active++) : false
			);

			payment_methods.addDisplayAllowedFn(function (block, e) {
				return this.comb.mayBeActive('pm', block)
					|| this._showInvalidGoodsPopup(this.comb.getData('pm', block.name))
					|| (e && new Event(e).stop() && 0);
			}.bind(this));

		}.bind(this));
		payment_methods.display(this.comb.getName('pm', this.order.active_payment) || false);

		return payment_methods;

	},

	updateUserInfo: function () {

		var contacts = this.checkout.getController('contacts'),
			fio = contacts.elems.fio.input.value;

		if (this.elems && this.elems.fio.input && fio) {

			new SavedSpecialBlock_class(this.elems.fio.block);

			this.elems.fio.input.defaultValue = fio;
		}

	},

	/**
	 * Обеспечивает синхронизацию адресов в заказах.
	 */
	updateAddress: function () {

		var options, hide_options, show_options,
			select = this.elems.delivery.address.select,
			orders = this.checkout.getController('delivery').elems.orders;

		Object.each(this.elems.delivery.address.fields, function (elem, name) {
			elem.addEvent('blur', function (e) {
				orders.fireEvent('OrderDeliveryAddressFieldBlur', {elem: elem, name: name});
			});
		});

		orders.addEvent('OrderDeliveryAddressFieldBlur', function (data) {
			var field = this.elems.delivery.address.fields[data.name];
			if (field && !field.getValue() && data.elem.isValid()) {
				field.defaultValue = data.elem.getValue();
			}
		}.bind(this));

		if (select) {

			options = Object.values(select.options).filter(function (item) {
				return $type(item) == 'element';
			});

			hide_options = options.filter(function (option) {
				return option.getProperty('city') && option.getProperty('city') != this.checkout.locality;
			}.bind(this));

			show_options = options.diff(hide_options);

			hide_options.each(function (option) {
				option.hide().disabled = true;
			});

			show_options.each(function (option) {
				option.show().disabled = false;
			});

			if (hide_options.contains(select.options[select.selectedIndex])) {
				show_options[0].selected = true;
			}

			if (show_options.length == 1) {
				select.hide();
			}

		}

	},

	/**
	 * Оживляет блок с комментарием
	 * @returns {*}
	 */
	updateComments: function () {
		var comments,
			onCommentShow = function (block) {
				block.handler.hide();
			},
			onCommentHide = function (block) {
				block.handler.show();
			};

		/*{* Комментарий к заказу *}*/
		comments = new ActiveBlocks_class(this.container)
			.setOptions({effects: this.options.block_toggle_effects})
			.setBlock(new SavedSpecialBlock_class(this.elems.comment.block), this.elems.comment.show, 'comment')
			.addOnFn(onCommentShow, onCommentHide)
			.setBlock(null, this.elems.comment.hide, null, true)
			.addOnFn(onCommentShow, onCommentHide);

		return comments;

	},

	/**
	 * Оживляет информационные попапы доставки и оплаты
	 */
	updateInfo: function () {
		var payments_info = this.options.data.payment_info.records.credit,
			options = {
				jst: {
					popup: this.options.tpl.popup,
					delivery: this.options.tpl.info
				}
			};

		Object.each(this.comb.view.pm, function (pms) {
			Object.each(pms, function (pm) {
				if (payments_info[pm.id]) {
					pm.short_description = payments_info[pm.id].checkout_description || payments_info[pm.id].description;
				}
			}, this);
		}, this);


		new RozetkaDeliveryInfoPopup_class(this.options.data.delivery_info, this.elems.info.delivery)
			.setOptions(options)
			.updateContent(this.comb.view.sd);

		options.jst.delivery = this.options.tpl.payment_info;

		new RozetkaDeliveryInfoPopup_class(this.comb.view.pm, this.elems.info.payment)
			.setOptions(options)
			.updateContent({});

	},

	updateAboutKidsBlock: function () {

		var options = {
			selectors: {
				date_inputs: [
					this.options.selectors.about_kids.birth_day,
					this.options.selectors.about_kids.birth_year
				]
			}
		};

		if (this.elems.about_kids.block) {

			/*{* Дети *}*/
			new SavedSpecialBlock_class(this.elems.about_kids.block, null, options);

		}

	},

	initItsForGift: function () {

		ItsForGift.setGiftPopup(this.container);

		this.elems.for_gift.checkbox.checked = ItsForGift.isChecked();

		new SavedSpecialBlock_class(this.elems.for_gift.label);

	},

	/**
	 * Обработчик смены доставки (инициирует обработку смены оплаты)
	 * @param block
	 */
	onDeliveryChange: function (block) {

		if (this.blocks.delivery && this.blocks.payments && this.comb.isAvailable()) {

			var md = this.blocks.delivery.getActiveBlocks().pop().name,
				sd = this.blocks[md].getActiveBlocks().pop().name,
				pts = this.comb.unique('name', this.comb.getPT(md, sd));

			this.comb.unique('name', this.comb.getPT()).each(function (pt) {
				if (pts.contains(pt)) {
					this.blocks.payments.enableBlock(pt);
				} else {
					this.blocks.payments.disableBlock(pt);
				}
			}, this);

			this.onPaymentChange();

			this.getDeliveryCost();

		}

		this._checkInput(block);

	},

	/**
	 * Обработчик смены типа оплаты (инициирует обработку смены метода оплаты)
	 * @param block
	 */
	onPaymentChange: function (block) {

		if (this.blocks.payments && this.comb.isAvailable()) {

			var md = this.blocks.delivery.getActiveBlocks().pop().name,
				sd = this.blocks[md].getActiveBlocks().pop().name,
				pt = this.blocks.payments.getActiveBlocks().pop().name,
				pms;

			if (pt && this.blocks[pt]) {

				pms = this.comb.unique('name', this.comb.getPM(pt, md, sd));

				this.comb.unique('name', this.comb.getPM(pt)).each(function (pm) {

					if (this.blocks[pt]) {
						if (pms.contains(pm)) {
							this.blocks[pt].enableBlock(pm);
						} else {
							this.blocks[pt].disableBlock(pm);
						}
					}
				}, this);

			}

			this.onPaymentMethodChange();

			this.getDeliveryCost();

			//this.validStep();

		}

	},

	/**
	 * Обработчик смены метода оплаты
	 * @param block
	 */
	onPaymentMethodChange: function (block) {

		if (this.blocks.payments && this.comb.isAvailable()) {

			var pt = this.blocks.payments.getActiveBlocks().pop(), pm,
				required_form_fields = [],
				credit_data = this.options.data.payment_info.records.credit;

			if (pt && this.blocks[pt.name]) {

				pm = this.blocks[pt.name].getActiveBlocks().pop();
				pm = this.comb.getData('pm', pm);
				required_form_fields = credit_data[pm.id] ? credit_data[pm.id].required_form_fields : [];


				pt.element.each(function (elem) {
					elem.setRequiredFields && elem.setRequiredFields(required_form_fields);
				});

			}

			this.getDeliveryCost();

			//this.validStep();

		}

		this._checkInput(block);

	},

	/**
	 * Обновляет стоимосить доставки из кеша
	 * Инициирует пересчет стоимости заказа и стоимости доставки.
	 */
	getDeliveryCost: function () {

		var data = this.getDeliveryData(),
			md = data.delivery.method_id,
			sd = data.delivery.service_id,
			pm = data.payment.method_id,
			key = sd + '_' + md + '_' + pm;

		if (this.delivery_data[key]) {

			this.updateCost({delivery_cost: this.delivery_data[key]}, data);

		}

		this.checkout.updateTotalCost();

	},

	/**
	 * обновление стоимости заказа и стоимостей доставок
	 * @param content
	 * @param data
	 */
	updateCost: function (content, data) {

		data = data || this.getDeliveryData();

		var md = data.delivery.method_id,
			sd = data.delivery.service_id,
			pm = data.payment.method_id,
			key = sd + '_' + md + '_' + pm,
			md_name = this.comb.getName('md', md);

		if (content) {

			if (Object.getLength(content.delivery_cost.all)) {

				this.delivery_data = content.delivery_cost.all;

				delete content.delivery_cost.all;

			}

			this.delivery_data[key] = content.delivery_cost;

			this.order.order_cost = content.purchases_cost;

			this.updateOrderCost();

		} else {

			this.delivery_data[key] = {};

		}

		this.blocks[md_name].container.getElements('[name^="cost_"]').empty();

		this.blocks[md_name].getBlocks(true).each(function (sd_block) {
			var key = this.comb.getId('sd', sd_block.name) + '_' + md + '_' + pm,
				active = sd == this.comb.getId('sd', sd_block.name),
				data = {
					delivery: this.delivery_data[key],
					term: this.comb.getData('sd', sd_block).terms[md_name],
					active: active
				};

			if (this.delivery_data[key]) {
				this.blocks[md_name].container.getElement('[name="cost_' + sd_block.name + '"]')
					.setHTML(App.getHTML(this.options.tpl.delivery, data));
			}
		}, this);

	},

	/**
	 * Возвращает данные для запроса оформления заказа.
	 * @returns {*}
	 */
	getData: function () {

		var form_data = this.checkout.collectData(this.container),
			delivery_data = this.getDeliveryData();

		delivery_data.delivery.address = {city: this.checkout.locality};

		delete form_data.order[this.order.index].delivery_method;
		delete form_data.order[this.order.index].delivery_service;
		delete form_data.order[this.order.index].payment;

		return Object.merge(this.getDefaultOrderData(), form_data.order[this.order.index], delivery_data);
	},

	/**
	 * get Default Order Data
	 *
	 * @returns Object
	 */
	getDefaultOrderData: function () {

		var data = {};
		if ($type(this.options.default_order_data) == 'object') {
			data = this.options.default_order_data;
		}

		return data;
	},

	/**
	 * Возвращает данные для запроса получения стоимости заказа.
	 * @returns {*}
	 */
	getDeliveryData: function () {

		if (this.blocks.delivery && this.blocks.payments) {

			var md = this.blocks.delivery.getActiveBlocks().pop(),
				sd = this.blocks[md.name].getActiveBlocks().pop(),
				pt = this.blocks.payments.getActiveBlocks().pop(),
				pm = this.blocks[pt.name]
					? this.blocks[pt.name].getActiveBlocks().pop()
					: this.comb.getPM(pt).shift();

			return {
				grouped_order_id: this.order.index,
				delivery: {
					method_id: this.comb.getId('md', md),
					service_id: this.comb.getId('sd', sd),
					locality_id: this.checkout.locality
				},
				payment: {
					method_id: this.comb.getId('pm', pm)
				}
			};

		}

	},

	showPreloader: function (tpl) {

		this.container.processStart(tpl);

	},

	hidePreloader: function () {

		this.container.processStop();

	},

	/**
	 * Активизирует радиокнопку, управляющий элемент активного блока.
	 * @param block
	 * @private
	 */
	_checkInput: function (block) {
		var input;
		if (block) {
			input = block.handler.getElement('input[type="radio"]').shift();
			if (input) {
				input.checked = true;
			}
		}
	},

	/**
	 * Делает доступной/не доступной кнопу
	 */
	validStep: function () {

		this.checkout.getController('delivery').validStep();

	},

	isOk: function () {

		return !this.container.notValid().length;

	},

	/**
	 * Показывает попап с несовместимыми товарами
	 * @param pm
	 * @private
	 */
	_showInvalidGoodsPopup: function (pm) {

		var data, pt = this.comb.getData('pt', pm.type),
			unavailable_goods = [];

		pm.unavailable_goods.each(function (goods_id) {
			unavailable_goods.push(Object.values(this.checkout.cart.goods[goods_id]).pop());
		}.bind(this));

		data = {credit: {title: pm.title}, goods: unavailable_goods};

		if (!this.unavailable_goods_popup) {
			this.unavailable_goods_popup = new Popup_class(this.options.tpl.popup);
		}

		this.unavailable_goods_popup.setContent(this.options.tpl.unavailable_goods, data);

		this._openCartOnClick(this.unavailable_goods_popup);

		this._openPopupOnStepVisible(this.unavailable_goods_popup);

	},

	_openPopupOnStepVisible: function (popup) {

		App.addOnDomReady(function () {
			if (this.container.isVisible()) {
				popup.open();
			}
		}.bind(this));

	},

	_openCartOnClick: function (container) {
		container.getElement('[name="edit"]').addEvent('click', function () {
			this.checkout.cart.openCart();
		}.bind(this));
	},

	/**
	 * При ответе стоимости заказа, каждый заказ проверяет доступен ли выбранный метод оплаты.
	 * Если не доступен, то активизирует выбранный ренее метод опрлаты
	 * и показывает попап предлагающий изменить состав корзины.
	 * @param data
	 * @private
	 */
	_onCheckoutResponse: function (data) {

		if (data
				&& data.content
				&& data.content.grouped_orders
				&& data.content.grouped_orders[this.order.index]
				&& data.content.grouped_orders[this.order.index].another_payment
				) {

			var another_payment = data.content.grouped_orders[this.order.index].another_payment,
				pm = this.comb.getData('pm', another_payment.payment),
				pt = this.comb.getData('pt', pm ? pm.type : null);

			if (pt) {

				this.blocks.payments.display(pt.name);

				this.blocks[pt.name] && this.blocks[pt.name].display(pm.name);

			}

			if (!this.price_limit_popup) {
				this.price_limit_popup = new Popup_class(this.options.tpl.popup);
			}

			this.price_limit_popup.setContent(this.options.tpl.price_limit, another_payment);

			this._openCartOnClick(this.price_limit_popup);

			this._openPopupOnStepVisible(this.price_limit_popup);

		}

	}

});

Order_class.implement(new Options(), new InitElements());

/**
 * Хелпер позволяющий работать с комбинациями доставок и оплат для заказа.
 * @type {Class}
 */
var Combinations = new Class({

	compatibly: null,

	data: null,

	view: null,

	type: {
		md: 'methods_delivery',
		sd: 'services_delivery',
		pt: 'payment_methods_types',
		pm: 'payments'
	},

	initialize: function (compatibly, data) {
		this.compatibly = compatibly;
		this.data = data;

		this.view = this.getView();

	},

	/**
	 * Возвращает уникальные значения свойств type из набора compatibly.
	 * @param type
	 * @param compatibly
	 * @returns {Array}
	 */
	unique: function (type, compatibly) {
		var result = [];
		Object.each((compatibly || this.compatibly), function (item) {
			result.include(type ? item[type] : item);
		});
		return result;
	},

	/**
	 * Возвращает подходящие комбинации
	 * @param md - method_delivery
	 * @param sd - service_delivery
	 * @returns {Array|*}
	 */
	compatible: function (md, sd) {
		md = this.getId('md', md);
		sd = this.getId('sd', sd);
		return this.compatibly.filter(function (item) {
			return (!$type(md) || item.method_delivery == md)
				&& (!$type(sd) || item.service_delivery == sd);
		});
	},

	/**
	 * Формирует данные для шаблона
	 * @returns {{md: *, pt: *, sd: {}, pm: {}}}
	 */
	getView: function () {

		var view = {
			md: this.getMD(),
			pt: this.getPT(),
			sd: {},
			pm: {}
		};

		view.md.each(function (md) {
			var sds = {};
			this.getSD(md).each(function (sd) {
				sds[sd.id] = sd;
			});
			view.sd[md.id] = sds;
		}, this);

		view.pt.each(function (pt) {
			var pms = {};
			this.getPM(pt).each(function (pm) {
				pms[pm.id] = pm;
			});
			view.pm[pt.id] = pms;
		}, this);

		return view;
	},

	/**
	 * Возвращает методы доставок
	 * @returns {*}
	 */
	getMD: function () {

		return this.fill(this.unique('method_delivery'), 'md');

	},

	/**
	 * Возвращает сервисы доставок
	 * @param md
	 * @returns {*}
	 */
	getSD: function (md) {

		return this.fill(this.unique('service_delivery', this.compatible(md)), 'sd');

	},

	/**
	 * Возвращает типы оплат
	 * @param md
	 * @param sd
	 * @returns {*}
	 */
	getPT: function (md, sd) {

		return this.fill(this.unique('type', this.getPM(null, md, sd)), 'pt');

	},

	/**
	 * Возвращает методы оплат
	 * @param pt
	 * @param md
	 * @param sd
	 * @returns {Array|*}
	 */
	getPM: function (pt, md, sd) {
		var payments = [];

		pt = this.getId('pt', pt);

		this.unique('payments', this.compatible(md, sd)).each(function (pms) {
			payments.merge(pms);
		});

		return this.fill(payments, 'pm').filter(function (pm) {
			return !$chk(pt) || pm.type == pt;
		});
	},

	/**
	 * Возвращает данные о запрошенной доставке или оплате
	 * @param type
	 * @param mix
	 * @returns {*}
	 */
	getData: function (type, mix) {

		type = this.type[type] || type;

		return $chk(mix) ? this.data[type][this.getId(type, mix)] : Object.values(this.data[type]);

	},

	/**
	 * По массиву id-шек и типу возвращает отсортированный массив с данными
	 * @param ids
	 * @param type
	 * @returns {Array}
	 */
	fill: function (ids, type) {
		return this.getData(type).filter(function (item) {
			return ids.contains(item.id);
		}).sort(function (a, b) {
			return (a.order - b.order) || (a.id - b.id);
		});
	},

	getIdByName: function (type, name) {

		var item = this.getData(type).filter(function (item) {
			return item.name == name;
		}).shift();

		return item ? item.id : null;

	},

	getId: function (type, mix) {
		var id = mix;

		if ($type(mix) == 'string') {

			id = this.getIdByName(type, mix);

		} else if ($type(mix) == 'object') {

			id = mix.id || this.getId(type, mix.name);

		}

		return id;
	},

	getName: function (type, mix) {

		var data = this.getData(type, mix);

		return data ? data.name : null;

	},

	/**
	 * Определяет доступность заказа по наличию комбинаций
	 * @returns {Number}
	 */
	isAvailable: function () {

		return this.compatibly.length;

	},

	/**
	 * Определяет может ли быть выбрана запрошенная доставка или оплата
	 * @param type
	 * @param mix
	 * @returns {boolean}
	 */
	mayBeActive: function (type, mix) {
		var by_goods,
			items = (type == 'pt') ? this.getPM(mix) : [this.getData(type, mix)];

		by_goods = items.filter(function (pm) {
			return !pm.unavailable_goods;
		});

		return !!by_goods.length;

	}
});