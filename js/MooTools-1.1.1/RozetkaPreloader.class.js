/**
 * Позволяет показывать прелоадер с задержкой если тот еще необходим.
 * Позволяет определять актуальность прелоадера исходя из нескольких независимых условий (посредсвом уникальных name).
 * Например, при нескольких ajax запросах, прелоадер нужно выключить когда не ожидается ни один из запросов.
 *
 * @type {Class}
 */
var Preloader_class = new Class({

	elem: null,

	tpl: null,

	delay: null,

	process_status: null,

	intervalId: null,

	initialize: function (elem, tpl, delay) {

		this.elem = elem;

		this.tpl = tpl;

		this.delay = delay;

		this.process_status = {};

	},

	/**
	 * Запускает прелоадер через время delay, если это еще нужно.
	 */
	processDelayStart: function (name, delay, tpl) {

		delay = $chk(delay) ? delay : this.delay;

		if ($chk(delay) && !isNaN(delay)) {

			this._setStatus(name);

			//this.intervalId && clearTimeout(this.intervalId);

			this.intervalId = setTimeout(function () {

				this.processUpdate(tpl);

			}.bind(this), delay.toInt());

		} else {

			this.processStart(tpl);

		}

	},

	/**
	 * Запускает прелоадер немедленно.
	 */
	processStart: function (name, tpl) {

		this._setStatus(name);

		this.elem.processStart(tpl || this.tpl);

	},

	_setStatus: function (name) {

		this.process_status[name || 'all'] = true;

	},

	_removeStatus: function (name) {

		if (name) {

			delete this.process_status[name];

		} else {

			this.process_status = {};

		}

	},

	/**
	 * Оределяет активен ли прелоадер.
	 * @returns {*}
	 */
	isProcess: function () {

		return Object.getLength(this.process_status);

	},

	/**
	 * Останавливает прелодер, если в нем больше нет надобности.
	 */
	processStop: function (name) {

		this._removeStatus(name);

		this.isProcess() || this.elem.processStop();

	},

	/**
	 * Запускает прелоадер, если это еще нужно.
	 */
	processUpdate: function (tpl) {

		this.isProcess() && this.elem.processStart(tpl || this.tpl);

	}

});