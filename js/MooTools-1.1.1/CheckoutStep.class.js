var CheckoutStep_class = new Class({

	Class: 'CheckoutStep_class',

	step_name: '',

	options: {
		container_selector: '#step',
		locality_selector: '#suggest_locality',
		selectors: {
			step_content: '[name="step_content"]',
			valid_block: '[name="step_content"]',
			next_button: '[name="next_step"]',
			edit_button: '[name="edit_step"]'
		},
		preloader: green_process_tpl
	},

	checkout: null,

	container: null,

	data: {},

	elems: {},

	is_ready: true,

	is_wait: false,

	valid_step_interval: null,

	valid_step_timeout: null,

	initialize: function (checkout) {

		this.checkout = checkout;

		this.container = $E(this.options.container_selector);

		this.elems = this.initElements(this.options.selectors, this.container);

	},

	init: function () {

		this.initEvents();

	},

	initEvents: function () {

		// Обработка событий Drag & Drop
		var initImputEvents = function (el) {
			var validStep = this.validStep.bind(this);
			if (el.addEventListener) { /*{* WebKit, Gecko *}*/
				el.addEventListener('input', validStep);
				el.addEventListener('dragdrop', validStep);
			} else if (el.attachEvent) { /*{* IE *}*/
				el.attachEvent('onpropertychange', validStep);
			}
			el.addEvent('keyup', validStep);
			el.addEvent('blur', validStep);
		};

		$ES('[required], [_required], [pattern], [_pattern]', this.elems.valid_block).map(initImputEvents.bind(this));

		$ES('select', this.elems.valid_block).addEvent('change', this.validStep.bind(this));

		this.elems.next_button && this.elems.next_button.addEvent('click', function (e) {

			if (!this.elems.valid_block.checkFields()) {
				$(document).fireEvent('checkoutFormNotValid', new Date().getTime());
			}

		}.bind(this));

		this.activeSelect(this.container);

	},

	/**
	 * Делает доступной/не доступной кнопку следующего шага
	 */
	validStep: function (e) {

		var valid = function () {
			if (this.isOk()) {
				this.elems.next_button.getParent().removeClass('opaque');
			} else {
				this.elems.next_button.getParent().addClass('opaque');
			}
		}.bind(this);

		clearTimeout(this.valid_step_timeout);

		if (this.elems.next_button) {
			this.valid_step_timeout = setTimeout(valid, 20);
		}

	},

	/**
	 * Активация шага
	 */
	open: function () {
		this.container.removeClass('disabled');
		this.elems.step_content.highlightFieldsReset();
		this.elems.step_content.show();
		this.validStep();
		//this.valid_step_interval = setInterval(this.validStep.bind(this), 1000);
	},

	/**
	 * Дизактивация шага
	 */
	close: function () {
		this.removeEvents('Success');
		this.removeEvents('Fail');
		this.elems.step_content.hide();
		//clearInterval(this.valid_step_interval);
	},

	showPreloader: function (tpl) {
		this.elems.step_content.processStart(tpl || this.options.preloader);
	},
	hidePreloader: function () {
		this.elems.step_content.processStop();
	},

	/**
	 * Все необходимые условия шага выполнены
	 * @returns {boolean}
	 */
	isOk: function () {
		return !this.elems.valid_block.notValid().length;
	},

	/**
	 * Возвращает данные для запроса оформления заказа.
	 * @returns {*}
	 */
	getData: function () {

		return this.checkout.collectData(this.container);

	},

	/**
	 * Добавлено для возможности удалять все события типа.
	 * @param type
	 * @returns {CheckoutStep_class}
	 */
	removeEvents: function (type) {
		if (type && this.$events && this.$events[type]) {
			delete this.$events[type];
		}
		return this;
	}

});

CheckoutStep_class.implement(new Options(), new Events(), new InitElements(), new ActiveSelect());