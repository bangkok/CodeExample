var CheckoutPurchases_class = new Class({

	Class: 'CheckoutPurchases_class',

	options: {
		tpl: {
			purchases: '/*{template_js_fetch file="my/checkout/_jst/purchases.jst" jst=1}*/',
			total: '/*{template_js_fetch file="my/checkout/_jst/total.jst" jst=1}*/',
			popup : '/*{template_script_fetch file="my/checkout/_jst/info-popup.jst" jst=1}*/'
		},
		container_selector: '#purchases_container',
		selectors: {
			purchases_block: "#purchases_block",
			total_block: "#total_block",
			purchases: '[name=purchases]',
			total: '[name=total]',
			edit: ['[name=edit]'],
			certificate: '[name="certificate_code"]'
		},
		preloader: green_process_tpl,
		delay_default: 1000
	},

	container: null,

	data: null,

	is_available: false,

	preloaders: null,

	initialize: function (checkout) {

		this.checkout = checkout;

		this.container = $E(this.options.container_selector);

		this.elems = this.initElements(this.options.selectors, this.container);

		this.elems.edit.addEvent('click', function (e) {
			new Event(e).stop();
			this.checkout.cart.openCart();
		}.bind(this));

		window.addEvent('scroll', this.onScroll.bind(this));
		window.addEvent('resize', this.onScroll.bind(this));

		this.initPreloaders();

	},

	update: function () {

		this.updatePurchases();

		this.updateTotal();

		this.hidePreloader('locality');

		this.onScroll();

	},

	updateCost: function (content, data) {

		this.data = content ? content.order : null;

		this.updateTotal();

		this.hidePreloader('cost');

	},

	updatePurchases: function () {

		this.elems.purchases.setHTML(
			App.getHTML(this.options.tpl.purchases, {
				cart: this.checkout.cart,
				controller: this
			})
		);

		this.is_available = !!this.getAvailablePurchases().length;

		if (!this.is_available) {
			this.elems.purchases_block.addClass('unavailable');
		} else {
			this.elems.purchases_block.removeClass('unavailable');
		}

		App.addOnDomReady(function () {
			$(document).fireEvent('purchasesUpdated');
		});

	},

	updateTotal: function () {

		if (this.data) {

			this.elems.total.setHTML(
				App.getHTML(this.options.tpl.total, {
					cart: this.checkout.cart,
					controller: this,
					data: this.data
				})
			);

		} else {

			this.showPreloader('cost');

		}

	},

	onChangeLocality: function () {

		this.showPreloader('locality');

	},

	/**
	 * Реакция на действие приводящие к изменению стоимости заказа.
	 */
	onChangeCost: function () {

		this.showPreloader('cost');

	},

	/**
	 * Возвращает пурчейсы из заказов.
	 * Можно отфильтровать пепредав функцию принимающую данные о заказе.
	 * @param order_condition
	 * @returns {Array}
	 */
	getPurchases: function (order_condition) {
		var purchases = [];
		Object.each(this.checkout.data.orders, function (order) {
			if (!order_condition || order_condition(order)) {
				purchases.merge(order.purchases);
			}
		});
		return purchases;
	},

	/**
	 * Возвращает доступные пурчейсы из заказов
	 * @returns {Array}
	 */
	getAvailablePurchases: function () {

		var purchases = [];

		if (this.checkout.data.orders && this.checkout.locality) {

			purchases = this.getPurchases(function (order) {
				return order.combinations.length && order.purchases;
			});

			purchases = purchases.map(function (id) {
				return this.checkout.cart.getPurchase(id);
			}, this).filter(function (val) {
				return $chk(val);
			});

		} else {

			purchases = this.checkout.cart.getPurchases();

		}

		return purchases;

	},

	/**
	 * Возвращает недоступные пурчейсы из заказов
	 * @returns {*}
	 */
	getUnavailablePurchases: function () {

		return this.checkout.cart.getPurchases().diff(this.getAvailablePurchases());

	},

	/**
	 * Возвращает общее количество пурчейсов.
	 * @param purchases
	 * @returns {number}
	 */
	getPurchasesCount: function (purchases) {
		var count = 0;

		Object.each(purchases || this.getAvailablePurchases(), function (purchase) {
			count += purchase.quantity;
		});

		return count;

	},

	/**
	 * Возвращает данные для запроса оформления заказа.
	 * @returns {*}
	 */
	getData: function () {

		return {
			certificate: this.elems.certificate.isVisible() ? this.elems.certificate.getValue() : null
		};

	},

	/**
	 * показать блок с пурчейсами
	 */
	showPurchases: function () {
		this.elems.purchases_block.show();

		this.updatePreloaders();
	},

	/**
	 * Скрыть блок с пурчейсами
	 */
	hidePurchases: function () {
		this.elems.purchases_block.hide();
	},

	/**
	 * Показать блок с окончательной ценой
	 */
	showTotal: function () {
		this.onScroll();
		this.elems.total_block.show();

		this.updatePreloaders();
	},

	/**
	 * Скрыть блок с итоговой ценой
	 */
	hideTotal: function () {
		this.elems.total_block.hide();
	},

	initPreloaders: function () {

		this.preloaders = {
			total: new Preloader_class(
				this.elems.total_block,
				this.options.preloader,
				this.options.delay_default
			),
			purchases: new Preloader_class(
				this.elems.purchases_block,
				this.options.preloader,
				this.options.delay_default
			)
		};

	},
	/**
	 * Активирует прелодеры в зависимости от причины
	 * @param name
	 */
	showPreloader: function (name) {

		if (name == 'locality') {
			this.preloaders.total.processStart('locality');
			this.preloaders.purchases.processDelayStart('locality');
		} else if (name == 'cost') {
			this.preloaders.total.processDelayStart('cost');
		} else {
			this.preloaders.total.processStart();
			this.preloaders.purchases.processStart();
		}

	},
	/**
	 * Дизактивирует прелодеры в зависимости от причины
	 * @param name
	 */
	hidePreloader: function (name) {

		this.preloaders.total.processStop(name);
		this.preloaders.purchases.processStop(name);

	},
	/**
	 * Необходимо когда видимый размер блока, по которому строится прелодер, меняется при активном прилоадере.
	 */
	updatePreloaders: function () {

		this.preloaders.total.processUpdate();
		this.preloaders.purchases.processUpdate();

	},

	/**
	 * Обеспечивает фиксацию блока с итоговой ценой
	 */
	onScroll: function () {
		var indent = 20,
			orders = this.checkout.getController('delivery').elems.orders,
			win_size = window.getSize();

		if (win_size.scroll.y > orders.getTop() - indent) {
			this.elems.total_block.addClass('bill-fixed').setStyle('top', indent);
			if (win_size.size.x < win_size.scrollSize.x) {
				this.elems.total_block.setStyle('left', this.container.getLeft() - win_size.scroll.x);
			} else {
				this.elems.total_block.setStyle('left', null);
			}
		} else {
			this.elems.total_block.removeClass('bill-fixed').setStyle('top', orders.getTop() - this.container.getTop());
			this.elems.total_block.setStyle('left', null);
		}

	},

	isOk: function () {

		return !!this.data && !!this.getAvailablePurchases().length && !this.preloaders.total.isProcess();

	}

});

CheckoutPurchases_class.implement(new Options(), new Events(), new InitElements());