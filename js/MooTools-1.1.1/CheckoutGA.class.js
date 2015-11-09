var CheckoutGA_class = new Class({

	Class: 'CheckoutGA_class',

	options: {
		category: 'Checkout',
		clickAction: 'click',
		fillAction: 'fill',
		selectAction: 'select-type',
		checkboxAction: 'checkbox',
		focusAction: 'focus',
		errorAction: 'error',
		clickElements: {
			deliveryMore: {path: '[name=delivery_info]', name: 'delivery-more'},
			paymentMore: {path: '[name=payment_info]', name: 'payment-more'},
			userAgreement: {path: '[id=user_agreement_link]', name: 'user-agreement'},
			editCart: {path: '[name=edit]', name: 'edit-cart'},
			orders_comment: {path: '[name=toggle_orders_comment]', name: 'show-orders-comment'},
			gift: {path: '#is_gift_button', name: 'for-gift'},
			purchases: {path: '[name=purchases] a[href!="#"]', multi: true, name: 'goods'}
		},
		fillElements: {
			name: {path: '#reciever_name', name: 'name'},
			phone: {path: '#reciever_phone', name: 'phone'},
			email: {path: '#reciever_email', name: 'e-mail'},
			comment: {path: '[name=comment]', name: 'comment'},
			another_city: {path: '#reciever_another_city', name: 'city-another'},
			street: {path: '#reciever_street', name: 'street'},
			house: {path: '#reciever_house', name: 'house'},
			flat: {path: '#reciever_flat', name: 'flat'},
			city: {path: '#suggest_locality', name: 'city'}
		},
		selectElements: {
			delivery: {path: '#delivery_method', name: 'delivery-'},
			payment: {path: '[name=payment_method_id]', name: 'payment-'},
			city: {path: '#reciever_city', name: 'city-'},
			phone_type: {path: '[name="user[phone][type]"]', name: 'phone-'},
			pickup: {path: '#self_receipt', name: 'pickup-'}
		},
		checkboxElements: {
			gift: {path: '#gift_checkbox', label: '#gift_label', name: 'gift-'}
		}

	},

	initialize: function () {

		//set events for click items
		this._setEventsForClick();

		//set events for fill items
		this._setEventsForFill();

		//set events for select items
		this._setEventsForSelect();

		//set events for checkbox items
		this._setEventsForCheckbox();

	},

	_setEventsForClick: function () {
		var click_elem, label, elem;

		for (click_elem in this.options.clickElements) {

			label = this.options.clickElements[click_elem].name;

			elem = this.options.clickElements[click_elem].multi
				? $ES(this.options.clickElements[click_elem].path)
				: $E(this.options.clickElements[click_elem].path);

			if (elem) {

				elem.addEvent('click', this._setEvent.bindWithEvent(
					this,
					{
						action: this.options.clickAction,
						category:  this.options.category,
						label: label
					}
				));

			}

		}

	},

	_setEventsForFill: function () {
		var fill_elem, label, elem;

		for (fill_elem in this.options.fillElements) {

			label = this.options.fillElements[fill_elem].name;

			elem = $(document.body).getElement(this.options.fillElements[fill_elem].path);

			if (elem) {

				elem.addEvent('focus', this._setEvent.bindWithEvent(
					this,
					{
						action: this.options.focusAction,
						category: this.options.category,
						label: label
					}
				));

				elem.addEvent('blur', this._setEvent.bindWithEvent(
					this,
					{
						action: this.options.fillAction,
						category: this.options.category,
						label: label
					}
				));

			}

		}

	},

	_setEventsForSelect: function () {
		var select_elem, elem, onChange, setChangeSelfHack, changeSelfHack;

		// особый хак, чтоб трекать события change когда select был открыт, но значение не изменилось [63331]
		changeSelfHack = function (e) {
			var select = new Event(e).target;
			select.fireEvent('change', [select, true]);
		}.bind(this);

		setChangeSelfHack = function (e) {
			var select = new Event(e).target;

			select.addEvent('blur', changeSelfHack);

			select.addEvent('change', function () {
				select.removeEvent('blur', changeSelfHack);
			}.bind(this));

		}.bind(this);

		onChange = function (e, user_initiated) {
			var el, label, select_elem, value, params;

			if (e.target) {
				el = new Event(e).target;
			} else if (user_initiated) {
				el = e;
				e = {target: e}; // хак для this._setEvent
			} else {
				return false;
			}

			// событие change может создаваться внешними классами, поэтому нельзя передавать label в bindWithEvent
			for (select_elem in this.options.selectElements) {
				if (this.options.selectElements[select_elem].elem === el) {
					label = this.options.selectElements[select_elem].name;
					break;
				}
			}

			if (el.selectedIndex != -1 ) {
				value = el.options[el.selectedIndex].getProperty('ga_value')
					|| el.options[el.selectedIndex].getText().trim();
			} else {
				value = '';
			}

			params = {
				action: this.options.selectAction,
				category: this.options.category,
				label: label + '(' + value + ')'
			};

			this._setEvent(e, params);

		}.bind(this);

		for (select_elem in this.options.selectElements) {

			elem = $E(this.options.selectElements[select_elem].path);

			if (elem) {

				this.options.selectElements[select_elem].elem = elem;

				elem.addEvent('focus', setChangeSelfHack);

				elem.addEvent('change', onChange);

			}

		}

	},

	_setEventsForCheckbox: function () {
		var checkbox_elem, elem, label, onClick;

		onClick = function (e, label) {
			var el = new Event(e).target, params = {};

			if (el.tagName == 'LABEL') {
				el = el.getElement(this.options.checkboxElements[checkbox_elem].path || 'input');
			}

			params.action = this.options.checkboxAction;
			params.category = this.options.category;
			params.label = label + (el.checked ? 'on' : 'off');

			this._setEvent(e, params);

		};

		for (checkbox_elem in this.options.checkboxElements) {

			elem = $E(this.options.checkboxElements[checkbox_elem].label)
				|| $E(this.options.checkboxElements[checkbox_elem].path);

			if (elem) {

				label = this.options.checkboxElements[checkbox_elem].name;

				elem.addEvent('click', onClick.bindWithEvent(this, label));

			}

		}

	},

	/**
	 *
	 * @param e - мутулзовский Event
	 * @param params
	 */
	_setEvent: function (e, params) {

		//по незаполненному полю не трекаем событие fill
		//или если было значение по умолчанию и оно не изменилось
		if (params.action == 'fill') {

			if (e.target.value
					&& e.target.value.length != 0
					&& (!$defined(e.target.default_value) || e.target.default_value != e.target.value)
					) {

				rozetkaEvents.trackEvent(params.category, params.action, params.label);

			}

		} else {

			rozetkaEvents.trackEvent(params.category, params.action, params.label);

		}

		var error = e.target.getProperty('style');

		if (error && error != '') {

			rozetkaEvents.trackEvent(params.category, 'error', params.label);

		}

	}

});