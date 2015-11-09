var Checkout_class = new Class({

	Class: 'Checkout_class',

	options: {
		ajax_url: '',
		form_selector: '#checkout-form',
		submit_selector: '#make-order',
		locality_selector: '#suggest_locality',
		controllers_class: {
			contacts: 'CheckoutContacts_class',
			delivery: 'CheckoutDelivery_class',
			purchases: 'CheckoutPurchases_class'
		},

		user_var_name: 'User',
		cart_var_name: 'Cart',
		delivery_data: {}, /*{* определяется в шаблоне *}*/
		order_data: {} /*{* определяется в шаблоне *}*/
	},

	data: {
		last_delivery_data: null,
		last_purchases_ids: null,
		skip_update_by_cart: null
	},

	controllers: {
		contacts: null,
		delivery: null,
		purchases: null
	},

	current_step: null,

	locality: null,

	suggest_locality: null,

	user: null,

	form: null,

	submit: null,

	steps: null,

	initialize: function (url) {

		this.options.url = url;

		this.form = $E(this.options.form_selector);

		this.submit = $E(this.options.submit_selector);

		this.user = window[this.options.user_var_name];

		this.cart = window[this.options.cart_var_name];

		this.locality = this.user.getVisitorCity();

		this.checkSavers();

	},

	/**
	 * очищает localStorage если последнее посешение этой страницы было ранее интервала
	 */
	checkSavers: function () {

		var interval = 2; /*{* мин *}*/

		if (localStorage.getItem('checkout_load') < $time() - interval * 60 * 1000) {
			try {
				Object.each(window.localStorage, function (item, key) {
					localStorage.removeItem(key);
				});
			} catch (ex) {

			}
		}

		window.addEvent('beforeunload', function () {
			localStorage.setItem('checkout_load', $time());
		});

	},

	init: function () {

		// инициируем зарание, чтоб побыстрее реагировать на смену города.
		this.getController('delivery');

		this.getController('purchases').update();

		/*{* Шаги *}*/
		this.steps = new ActiveBlocks_class(this.form)
			.setBlock($E('[name="step_content"]', 'step_contacts'), $E('[name="edit_step"]', 'step_contacts'), 'contacts')
			.addOnFn(
				function (block) {
					this.getController(block.name).open();
				}.bind(this),
				function (block) {
					$(document).fireEvent('checkoutFormSent', new Date().getTime());
					this.getController(block.name).close();
				}.bind(this)
			)
			.setBlock($E('[name="step_content"]', 'step_delivery'), $ES('[name="next_step"]', 'step_contacts'), 'delivery')
			.addOnFn(
				function (block) {
					this.getController(block.name).open();
					$(document).fireEvent('deliveryStepOpened');
				}.bind(this),
				function (block) {
					this.getController(block.name).close();
				}.bind(this)
			)
			.addDisplayAllowedFn(function (block) {
				var isActiveOk = true,
					isAllowed;

				this.steps.getActiveBlocks().each(function (block) {
					isActiveOk &= this.getController(block.name).isOk();
				}, this);

				isAllowed = isActiveOk && this.getController(block.name).is_ready;

				if (isAllowed && this.getController(block.name).is_wait) {
					isAllowed = false;
					this.waitResponse(block.name, isActiveOk);
				}

				return isAllowed;
			}.bind(this));

		this.steps.display('contacts');

		this.suggest_locality = $E(this.options.locality_selector);

		if (!this.suggest_locality.getValue()) {
			this.suggest_locality.value = User.getVisitorCityRecord().title || '';
		}

		this.initEvents();

		if (location.getHashParam('step')) {
			this.steps.display(location.getHashParam('step'));
		}

	},

	initEvents: function () {

		this.submit.addEvent('click', this.onSubmit.bind(this));

		this.cart.addEvent('update', this.onCartUpdate.bind(this));

		this.suggest_locality.addEvent('ChangeLocality', this.onChangeLocality.bind(this));

		App.addEvent('CouponActionStart', this.onChangeCost.bind(this));

		App.addEvent('CouponActionComplete', function (resp) {
			this.updateCost(resp);
			this.data.skip_update_by_cart = true;
		}.bind(this));

	},

	waitResponse: function (name, usePreloader) {

		var onResp = function (name) {
			usePreloader && this.steps.getActiveBlocks().each(function (block) {
				this.getController(block.name).hidePreloader();
			}, this);
			this.getController(name).removeEvents('Success');
			this.getController(name).removeEvents('Fail');
		}.bind(this);

		usePreloader && this.steps.getActiveBlocks().each(function (block) {
			this.getController(block.name).showPreloader();
		}, this);

		this.getController(name).addEvent('Success', function () {

			onResp(name);

			this.steps.display(name);

		}.bind(this));

		this.getController(name).addEvent('Fail', function () {

			onResp(name);

			App.log(name + ' error');

		}.bind(this));

	},

	getController: function (name) {

		if (this.controllers[name] === null) {

			this.controllers[name] =
				new (App.getConstructorByClassName(this.options.controllers_class[name]))(this);

			this.controllers[name].init && this.controllers[name].init();

		}

		return this.controllers[name];

	},

	onChangeLocality: function (param) {

		if (param.element.id && this.locality != param.element.id) {

			this.locality = param.element.id;

			this.getController('contacts').onChangeLocality(this.locality);

			this.getController('delivery').onChangeLocality(this.locality);

			this.getController('purchases').onChangeLocality(this.locality);

		}

	},

	/**
	 * Реакция на действие приводящие к изменению стоимости заказа.
	 */
	onChangeCost: function () {

		this.getController('purchases').onChangeCost();

		this.getController('delivery').onChangeCost();

	},

	onCartUpdate: function () {

		var cart_purchases_ids = this.getNotCoincidePurchases([]);

		if (this.data.last_purchases_ids === null) {
			this.data.last_purchases_ids = cart_purchases_ids;
			this.data.skip_update_by_cart = true; /*{* при загрузке корзина обновляется дважды *}*/
		}

		if (this.getNotCoincidePurchases(this.data.last_purchases_ids).length) {

			this.data.last_purchases_ids = cart_purchases_ids;

			this.getController('delivery').getOrdersData(this.locality);

		} else if (this.cart.is_updated) {

			this.data.skip_update_by_cart || this.getCost();

			this.data.skip_update_by_cart = false;

		}

		this.getController('purchases').update();

	},

	/**
	 * Возвращает расхождение массивов переданных id  и id пурчейсов в корзине.
	 * @param other_purchases_ids
	 * @returns {*}
	 */
	getNotCoincidePurchases: function (other_purchases_ids) {

		var cart_purchases_ids = this.cart.getPurchases().map(function (purchase) {
			return purchase.id;
		});

		return other_purchases_ids.diff(cart_purchases_ids).merge(cart_purchases_ids.diff(other_purchases_ids));

	},

	/**
	 * заказ может быть отправлен на сохранение
	 * @returns {boolean}
	 */
	isOk: function () {

		// не хватет проверок по предыдущему шагу, но пока так.
		return this.getController('delivery').isOk()
			&& this.getController('purchases').isOk();

	},

	/**
	 * Собирает данные из элементов формы, ключем будет имя элемента
	 * @param container
	 * @returns {Object}
	 */
	collectData: function (container) {
		var data = {},
			name2data = function (name, value) {
				var item = value;
				$A(name.split(/[\[\]]+/)).reverse().each(function (name) {
					var temp = {};
					if (name) {
						temp[name] = item;
						item = temp;
					}
				});
				return item;
			},
			isCollectible = function (el) {
				return el.name && !el.disabled && !el.blocked && el.getValue() !== undefined
					&& (el.type != 'radio' || el.checked);
			},
			isRequired = function (el) {
				return el.getProperty('required') || el.getProperty('_required');
			},
			hasValue = function (el) {
				return el.getValue() && el.getValue().trim() !== '';
			};

		(container || this.form).getFormElements().each(function (el) {

			if (isCollectible(el) && (isRequired(el) || hasValue(el))) {

				Object.merge(data, name2data(el.name, el.getValue()));

			}

		});

		return data;

	},

	/**
	 * Возвращает данные для запроса оформления заказа.
	 * @returns {{}}
	 */
	getData: function () {

		var data = {};

		Object.keys(this.options.controllers_class).each(function (name) {

			if (this.getController(name).getData) {
				Object.merge(data, this.getController(name).getData());
			}

		}, this);

		return data;

	},

	/**
	 * Формирует запрос получения стоимости заказа
	 * @param index
	 */
	getCost: function (index) {

		var onTimeOut = function (data) {
			if (data && this.data.last_delivery_data === data) {
				this.ajaxAction({
					data: data,
					action: 'getTotalCostByDeliveryAndPayment',
					onComplete: this.updateCost.bindAsEventListener(this, data)
				});
			}
		};

		this.data.last_delivery_data = this.getController('delivery').getData(true);

		if (this.data.last_delivery_data) {

			this.data.last_delivery_data.order_index = index;

			/*{* страховка от множественного запуска getCost для одного действия пользователя. *}*/
			setTimeout(onTimeOut.bind(this, this.data.last_delivery_data), 1);

			this.onChangeCost();

		} else {

			this.getController('purchases').updateCost({order : {}});

		}

	},

	/**
	 * onComplete метод обновления стоимости заказа
	 * @param resp
	 * @param data
	 */
	updateCost: function (resp, data) {
		var response = new Response_class(resp);

		this.fireEvent('checkoutResponseReceived', response);

		if (!data || !data.order_index || this.data.last_delivery_data === data) {

			App.log('getTotalCostByDeliveryAndPayment', cloneOf(response.content), data);

			if (response.isError() && $type(resp) == 'string') {

				response.Message && App.showMessage(response.Message);

			}

			this.getController('purchases').updateCost(response.content, data);

			this.getController('delivery').updateCost(response.content, data);

			// при множественных запросах состояние купона может стать отличным от сессии. Принимаем сессию за правду.
			if (response.content && response.content.order) {

				if (response.content.order.coupon && !this.coupon.coupon_active) {

					this.coupon.cancelCoupon();

				} else if (!response.content.order.coupon && this.coupon.coupon_active) {

					this.coupon.onActionCancelComplete(resp);

				}

			}

		}

	},

	/**
	 * Формирует запрос оформления заказа
	 * @param e
	 */
	onSubmit: function (e) {

		var time = new Date().getTime(),
			options = {
				data: this.getData(),
				onComplete: this.onSaveOrder.bindAsEventListener(this, time)
			};

		if (this.isOk()) {

			$(document).fireEvent('checkoutFormSent', time);

			App.log('onSubmit', options.data);

			this.ajaxAction(options);

			this.getController('delivery').showPreloader();
			this.getController('purchases').showPreloader();

		}

		if (e) {
			new Event(e).stop();
		}

	},

	/**
	 * onComplete метод сохранения заказа
	 * @param resp
	 * @param time
	 */
	onSaveOrder: function (resp, time) {

		var response = new Response_class(resp),
			event_data = {extend_event: []},
			time_event = {extend_event: [{name: 'timingValue', value: (new Date().getTime() - time) / 1000}]};

		App.log('onSaveOrder', response);

		if (!response.isDone()) {

			this.getController('delivery').hidePreloader();
			this.getController('purchases').hidePreloader();

			if ($defined(response.Message)) {
				App.showMessage(response.Message);
			}

			event_data.extend_event.push({name: 'eventError', value: response.Message.content});

			$(document).fireEvent('formSentResponseErrorTime', time_event);
			$(document).fireEvent('formSentResponseError', event_data);

		} else {

			$(document).fireEvent('formSentResponseSuccessTime', time_event);

			App.fireEvent('ClearFormFields');

		}

		$(document).fireEvent('saveOrderAttempt', event_data);

		response.doAction();

	},

	/**
	 * Инициирует пересчет стоимости заказа.
	 */
	updateTotalCost: function () {

		if (!this.cart.getPopup().isOpened()) {

			this.getCost();

		} else {

			this.cart.getPopup().addEventOnce('close', function () {

				this.getCost();

			}.bind(this));

		}

	},

	ajaxAction: function (options) {

		return new Ajax('/cgi-bin/form.php', {
			data: options.data,
			method: 'post',
			headers: {ajaxAction: this.options.url + (options.action ? '#' + options.action : '')},
			onComplete: options.onComplete
		}).request()
			.addEvent('onFailure', options.onFailure || options.onComplete || function () {
				App.showMessage(new Response_class().Message);
			});

	}

});

Checkout_class.implement(new Options(), new Events());
