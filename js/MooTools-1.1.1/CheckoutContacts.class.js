var CheckoutContacts_class = CheckoutStep_class.extend({

	Class: 'CheckoutContacts_class',

	options: {
		container_selector: '#step_contacts',
		selectors: {
			next_button: ['[name="next_step"]'],
			next_field: '[name="next_field"]',
			valid_block: '[name="valid_block"]',
			locality: '[name="user[address][locality_id]"]',
			locality_block: '[name="locality_block"]',
			tabs: {
				menu: '[name="tab_menu"]',
				new_user: '[name="new_user"]',
				new_user_tab: '[name="new_user_tab"]',
				member_user: '[name="member_user"]',
				member_user_tab: '[name="member_user_tab"]',
				with_pass: '[name="with_pass"]'
			},
			auth: {
				block: '#auth_block',
				login: '[name="user[login]"]',
				pass: '[name="user[password]"]',
				auth_submit: '[name="auth_submit"]',
				temp_submit: '[name="temp_submit"]',
				email_block: '[name="auth_email_block"]',
				authorization: '[name="authorization"]',
				forgot_button: '[name="forgot_button"]',
				remembered_button: '[name="remembered_button"]',
				send_temp_pass: '[name="send_temp_pass"]',
				send_temp_pass_button: '[name="send_temp_pass_button"]',
				remind_password: '[name="remind_password"]',
				return_block: '[name="return_block"]',
				temp_pass: '[name="user[temp_pass]"]',
				msg_block: ['[name="auth_msg_block"]'],
				msg: ['[name="auth_msg"]']
			},
			email: {
				input: '[name="user[email]"]',
				block: '[name="email_block"]',
				info: '[name="email_info"]',
				msg: '[name="email_msg"]',
				continue_button: '[name="continue_button"]',
				email_preloader: '[name="email_preloader"]'
			},
			pass: {
				block: '[name="pass_block"]',
				input: '[name="pass_input"]',
				button: '[name="pass_button"]',
				msg: '[name="pass_msg"]'
			},
			phone: {
				input: '[name="user[phone][title]"]',
				select: '#phone_select'
			},
			fio: {
				input: '[name="user[recipient_title]"]'
			},
			sms_code: ''
		},
		auth_msg_tpl: '/*{template_js_fetch file="my/checkout/_jst/auth_msg.jst" jst=1}*/',
		email_preloader: '/*{image file="suggest_ajax.gif"}*/'
	},

	tabs: {},

	is_email_checking: false,

	is_email_known_or_empty: false,

	init: function () {
		var getValue = function () {
			return this.value;
		};

		this.parent();

		// mootools 1.11 тупит
		this.elems.email.input.getValue = getValue;
		this.elems.phone.input.getValue = getValue;

		this.elems.phone.select && this.elems.phone.select.fireEvent('change');

		if (this.elems.email.input.value == '') {
			this.elems.email.input.value = this.checkout.user.getEmail();
		}

		this.initMenu();
		this.initAuth();

		this.onChangeLocality();

		setTimeout(this.validStep.bind(this), 1000);

	},

	initEvents: function () {

		this.parent();

		$ES('[required], [_required], [pattern], [_pattern]', this.elems.tabs.member_user_tab)
			.addEvent('keyup', this.validAuth.bind(this));

		this.checkout.user.addEvent('signChange', this.onSignChange.bind(this));

		this.elems.email.input.addEvent('blur', this.validStep.bind(this));
		this.elems.email.input.addEvent('keyup', this.validStep.bind(this));

		this.elems.auth.auth_submit.addEvent('click', this.authSubmit.bind(this));
		this.elems.auth.temp_submit.addEvent('click', this.tempAuthSubmit.bind(this));

		//this.elems.auth.send_temp_pass.addEvent('click', this.sendTempPass.bind(this));
		this.elems.auth.send_temp_pass_button.addEvent('click', this.sendTempPass.bind(this));

	},

	initMenu: function () {

		this.tabs.menu = new ActiveBlocks_class()
			.setBlock(new SavedSpecialBlock_class(this.elems.tabs.new_user_tab), this.elems.tabs.new_user, 'new_user', true)
			.setBlock(this.elems.tabs.member_user_tab, this.elems.tabs.member_user, 'member_user')
			.addHandler(this.elems.tabs.with_pass)
			.addOnFn(this.validAuth.bind(this));
	},

	initAuth: function () {

		this.tabs.user = new ActiveBlocks_class()
			.setBlock(this.elems.auth.authorization, this.elems.auth.remembered_button, 'remembered', true)
			.addHandler(this.elems.tabs.with_pass)
			.addOnFn(this.syncAuthEmail.bind(this))
			.setBlock(this.elems.auth.remind_password, this.elems.auth.forgot_button, 'forgot')
			.setBlock(this.elems.auth.return_block, null, 'return')
			.addOnFn(
				function () {
					this.elems.auth.login.disabled = true;
				}.bind(this),
				function () {
					this.elems.auth.login.disabled = false;
				}.bind(this)
			)
			.setBlock(this.elems.auth.msg_block);

		this.tabs.user.addEvent('Show', function (block) {
			block.element.highlightFieldsReset();
			this.elems.auth.msg_block.hide().empty();
		}.bind(this));

	},

	onSignChange: function (e) {

		if (this.checkout.user.isAuth()) {

			this.elems.email.block.hide();

		} else {

			this.elems.email.block.show();

			this.onEmailInput();

		}

		this.validStep();

	},

	/**
	 * Проверяет email на валидность, существование в базе(с задержкой).
	 * Пока проверка не закончена, email считается не валидным.
	 * Инициирует синхронизацию аналогичных полей
	 * @param e
	 * @returns {boolean}
	 */
	onEmailInput: function (e) {
		var onTimeOut;

		if (
			this.elems.email.input.getValue().trim() == ''
				|| this.checkout.user.isAuth()
				|| !this.elems.email.input.isValid()
		) {

			this.elems.email.input.old_value = '';

			this.skipAuth();

		} else if (this.elems.email.input.value != this.elems.email.input.old_value) {

			this.is_email_checking = true;

			this.is_email_known_or_empty = ['', this.elems.email.input.defaultValue, this.checkout.user.getEmail()]
				.contains(this.elems.email.input.getValue());

			this.elems.email.input.old_value = this.elems.email.input.getValue();

			this.syncAuthEmail();

			onTimeOut = function () {
				if (this.elems.email.input.old_value == this.elems.email.input.getValue()) {

					this.elems.email.email_preloader.processStart(this.options.email_preloader);
					var options = {
						data: {email: this.elems.email.input.getValue()},
						action: 'isUserExist',
						onComplete: this.onCheckUser.bind(this)
					};

					this.checkout.ajaxAction(options);

				} else {

					this.is_email_checking = false;

				}
			}.bind(this);

			setTimeout(onTimeOut, 500);

		}

		return !this.is_email_checking || this.is_email_known_or_empty;

	},

	/**
	 * Синхронизирует email-ы
	 */
	syncAuthEmail: function () {

		if (!this.elems.auth.login.disabled && this.elems.email.input.getValue()) {
			this.elems.auth.login.value = this.elems.email.input.getValue();
		}

	},

	onCheckUser: function (resp) {

		var event_data = {extend_event: []}, response = new Response_class(resp);

		this.elems.email.email_preloader.processStop();

		if (response.isDone() && !this.checkout.user.isAuth()) {

			this.needAuth();

			event_data.extend_event.push({name: 'eventError', value: 'Пользователь уже существует'});

		} else {

			this.skipAuth();

		}

		$(document).fireEvent('userExistsChecked', event_data);

		this.validStep();

	},

	/**
	 * предлагать авторизацию
	 */
	needAuth: function () {

		this.is_email_checking = false;

		this.elems.email.msg.show();
		this.elems.email.info.hide();
		this.elems.next_field.hide();

		this.elems.email.input.addClass('incorrect');

	},

	/**
	 * пропустить авторизацию
	 */
	skipAuth: function () {

		this.is_email_checking = false;

		this.elems.email.msg.hide();
		this.elems.email.info.show();
		this.elems.next_field.show();

		this.elems.email.input.removeClass('incorrect');
		this.elems.email.input.setStyles({'background-color': ''});

	},

	auth: function (login, password) {

		this.checkout.user.trySignIn({
			login: login,
			password: password
		});

	},

	authSubmit: function (e) {
		new Event(e).stop();

		if (
			this.elems.auth.email_block.checkFields()
				&& this.elems.auth.authorization.checkFields()
		) {

			this.auth(this.elems.auth.login.value, this.elems.auth.pass.value);

			this.elems.auth.msg_block.hide();

			this.checkout.user.addEventOnce('signIn', this._onSuccessAuth.bind(this));
			this.checkout.user.addEventOnce('signInFailed', this._onFailAuth.bind(this));
		}

	},

	_onSuccessAuth: function (S) {

		this.onSignIn(S);

		$(document).fireEvent('signInAttempt');

	},

	_onFailAuth: function (msg) {

		var event_data = {extend_event: [{name: 'eventError', value: msg.content}]};

		$(document).fireEvent('signInAttempt', event_data);

		this.onSignInFailed(msg);


	},

	tempAuthSubmit: function (e) {
		new Event(e).stop();

		if (
			this.elems.auth.email_block.checkFields()
				&& this.elems.auth.return_block.checkFields()
		) {

			this.auth(this.elems.auth.login.value, this.elems.auth.temp_pass.value);

			this.elems.auth.msg_block.hide();

			this.checkout.user.addEventOnce('signIn', this.onSignIn.bind(this));
			this.checkout.user.addEventOnce('signInFailed', this.onSignInFailed.bindAsEventListener(this, true));
		}

	},

	/**
	 * Авторизация по временному паролю
	 * @param e
	 */
	sendTempPass: function (e) {

		new Event(e).stop();

		if (this.elems.auth.email_block.checkFields()) {

			this.elems.auth.temp_pass.value = '';

			this.checkout.user.sendTemporaryPassword(
				this.elems.auth.login.getValue(),
				function (resp) {
					var response = new Response_class(resp);
					response.isDone()
						? this.tabs.user.display('return')
						: response.Message && App.showMessage(response.Message);
				}.bind(this)
			);

		}

	},

	onSignIn: function (S) {

		this.elems.auth.msg_block.hide();
		window.location.reload();

	},
	onSignInFailed: function (msg, temp_pass) {

		this.elems.auth.msg_block.setHTML(App.getHTML(this.options.auth_msg_tpl, {msg: msg, temp_pass: temp_pass}));

		$ES(this.options.selectors.auth.send_temp_pass, this.elems.auth.msg_block)
			.addEvent('click', this.sendTempPass.bind(this));

		$(document).fireEvent('sendTmpPasswordButtonShown');

		this.elems.auth.msg_block.show();

		if (msg.code == 4) {
			this.elems.auth.login.highlightError().focus();
		} else if (msg.code == 5) {

			if (temp_pass) {
				this.elems.auth.temp_pass.highlightError().focus();
			} else {
				this.elems.auth.pass.highlightError().value = '';
				this.elems.auth.pass.focus();
			}

		}

		this.validAuth();

	},

	onChangeLocality: function (locality_id) {

		this.elems.locality.value = locality_id || this.checkout.user.getVisitorCity();

		this.validStep(locality_id);

	},

	/**
	 * Делает доступной/не доступной кнопку авторизации
	 */
	validAuth: function (e) {

		var onTimeOut = function () {
			if (!this.elems.tabs.member_user_tab.notValid().length) {
				this.elems.auth.auth_submit.getParent().removeClass('opaque');
			} else {
				this.elems.auth.auth_submit.getParent().addClass('opaque');
			}
		};

		// хак. Чтоб проверять валиднсть после отображения блока
		e ? setTimeout(onTimeOut.bind(this), 20) : onTimeOut();
	},

	/**
	 * Активация шага
	 */
	open: function () {
		this.parent();
		this.elems.edit_button.hide();
		this.container.removeClass('completed');

		this.checkout.getController('purchases').showPurchases();

		this.checkout.getController('delivery').addEvent('Success', this.validStep.bind(this));

		this.validStep();
	},

	/**
	 * подсвечивает поле города если все пурчейсы недоступны
	 * @returns {Boolean}
	 */
	checkPurchases: function () {

		if (!this.checkout.getController('purchases').is_available) {
			this.elems.locality_block.addClass('unavailable');
		} else {
			this.elems.locality_block.removeClass('unavailable');
		}

		return this.checkout.getController('purchases').is_available;
	},

	/**
	 * Дизактивация шага
	 */
	close: function () {
		this.parent();
		this.elems.edit_button.show();
		this.container.addClass('completed');
		this.checkout.getController('purchases').hidePurchases();
	},

	/**
	 * Все необходимые условия шага выполнены
	 * @returns {boolean}
	 */
	isOk: function () {
		return this.onEmailInput() && this.checkPurchases() && this.parent() && !!this.elems.locality.value.toInt();
	},

	/**
	 * Возвращает данные для запроса оформления заказа.
	 * @returns {*}
	 */
	getData: function () {

		var data = this.parent();

		return {
			user: {
				recipient_title: data.user.recipient_title,
				address: data.user.address,
				phone: data.user.phone,
				email: data.user.email
			}
		};

	}

});