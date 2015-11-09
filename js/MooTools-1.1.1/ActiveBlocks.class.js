/**
 * Контроллер управления блоками.
 * Связывает блоки по принципу: активные видны, остальные скрыты.
 *
 * Блок состоит из:
 * - имя блока. Если не задано, то будет сформировано автоматически.
 * - набор элементов. Элеметами могут быть объекты поддерживающие методы show и hide
 * - набор управляющих элементов. Должен поддерживать метод addEvent
 * 		Действие связанное с handler-ом активизирует блок (вызывает show у элементов)
 *
 */
var ToggleBlocks_class = new Class({

	Class: 'ToggleBlocks_class',

	options: {
		event: 'click',
		stop_events: true,
		stop_propagation_events: false,
		effects: {
			show: [],
			hide: []
		}
	},

	container: null,

	blocks: null,

	/**
	 * Инициализация
	 *
	 * @param {Element} container - родительский элемент для блоков
	*/
	initialize: function (container) {

		this.blocks = [];

		this.container = container;

	},

	/**
	 * Добавляет новый блок
	 * @param {Object} element - элемент или набор элементов
	 * @param {Object} handler - управляющий элемент или набор
	 * @param {String} name - название блока
	 * @param {Boolean} active - будет ли блок активирован при добавлении
	 * @returns {*}
	 */
	setBlock: function (element, handler, name, active) {

		var index = this.blocks.length,
			block = {
				active: active,
				handler: $$(this.initElements(handler, this.container)),
				element: $$(this.initElements(element, this.container)),
				name: name || this.Class + index
			};

		// в element передано нечто не ObjectHTML, но имеющее необходимый интерфейс.
		if (
			!block.element.length && element
				&& $type(element.show) == "function"
				&& $type(element.hide) == "function"
		) {

			block.element.push(element);

		}

		this.blocks.push(block);

		this._initEvents(this.blocks[index]);

		active ? this._showBlock(this.blocks[index]) : this._hideBlock(this.blocks[index]);

		return this;

	},

	/**
	 * Добавяет элементы в блок с именем name, если блока нет, он будет создан
	 * @param {Object} element - элемент или набор элементов
	 * @param {String} name - название блока
	 * @returns {*}
	 */
	addBlock: function (element, name) {

		var blocks = this.getBlocks(name);

		if (blocks.length) {

			blocks.each(function (block) {

				block.element.push(element);

				block.active ? this._showBlock(block) : this._hideBlock(block);

			}, this);

		} else {

			this.setBlock(element, null, name);

		}

		return this;

	},

	/**
	 * Добавляет управляющий элемент к сущетсвующиму блоку
	 * @param {Object} handler
	 * @param {String} action - название события, например click
	 * @param {String} name - название блока
	 * @returns {*}
	 */
	addHandler: function (handler, action, name) {

		this.getBlocks(name).each(function (block) {

			if (!block.handler.push) {
				block.handler = $$(block.handler);
			}

			block.handler.push(handler);

			this._initEvents({name: block.name, handler: handler, action: action});

		}, this);

		return this;

	},

	/**
	 * Показывает блоки с именем name и скрывает остальные.
	 * @param name - имя, по какому надо показать блок
	 * @param e - событие по которому вызвался метод
	 * @returns {*}
	 */
	display: function (name, e) {
		var show_blocks, active_blocks;

		e && this.options.stop_events && new Event(e).stop();
		e && this.options.stop_propagation_events && new Event(e).stopPropagation();

		show_blocks = this.getBlocks(name);

		if (this._isDisplayAllowed(show_blocks, e)) {

			active_blocks = this.getActiveBlocks();

			active_blocks.diff(show_blocks).each(this._hideBlock, this);

			show_blocks.diff(active_blocks).each(this._showBlock, this);

		}

		return this;

	},

	/**
	 * Выбирает блоки с именем name или последний добавленный
	 * @param name
	 * @returns {Array}
	 */
	getBlocks: function (name) {

		return name === undefined
			? [this.blocks.getLast()]
			: this.blocks.filter(this._condition.bindAsEventListener(this, name));

	},

	/**
	 * Выбирает все активные блоки
	 *
	 * @returns {Array}
	 */
	getActiveBlocks: function () {

		return this.getBlocks(true).filter(function (block) {
			return block.active;
		});

	},

	/**
	 * На управляющий элемент вешается обработчик события(click),
	 * по которому вызывается метод display
	 * @param block
	 * @private
	 */
	_initEvents: function (block) {

		block.handler && block.handler.addEvent(
			block.action || this.options.event,
			function (e) {
				this.display(block.name, e);
			}.bind(this)
		);

	},

	_condition: function (block, key) {
		var key_condition = false;

		if (key === true) {

			key_condition = true;

		} else if (typeof key == 'number' || typeof key == 'string') {

			key_condition = key == block.name;

		} else if (typeof key == 'object') {

			key_condition =  block.handler.contains(key);

		}

		return key_condition;
	},

	/**
	 *Проверяет, можно ли показать переданные блоки
	 * @param show_blocks
	 * @param e
	 * @private
	 */
	_isDisplayAllowed: function (show_blocks, e) {
		return !!show_blocks.length;
	},

	/**
	 * Показать блок
	 * @param block
	 */
	_showBlock: function (block) {//App.log('show', this, block.name, block);
		block.active = true;
		block.handler && block.handler.addClass('active');
		block.element && block.element.show();
		this._effectsApply(this.options.effects.show, block);
	},


	/**
	 * Скрыть блок
	 * @param block
	 */
	_hideBlock: function (block) {//App.log('hide', this, block.name, block);
		block.active = false;
		block.handler && block.handler.removeClass('active');
		block.element && block.element.hide();
		this._effectsApply(this.options.effects.hide, block);
	},

	/**
	 * Добвляет эффекты блоку
	 * @param effects
	 * @param block
	 */
	_effectsApply: function (effects, block) {
		if (effects && block) {
			effects.each(function (effect) {
				effect(block);
			});
		}
	}

});

ToggleBlocks_class.implement(new Options(), new InitElements());

/**
 * Позволяет определить методы, которые будут выполенены перед отображением или скрытием блока.
 * Также позволяет определить проверочный метод, определяющий возможность отображения блока.
 */
var ActiveBlocks_class = ToggleBlocks_class.extend({

	Class: 'ActiveBlocks_class',

	/**
	 * Расширяет возможности блока. позволяя вызывать
	 * дополнитьно функции при скрытии и показе блока
	 * @param onShow - функция при показе
	 * @param onHide - функция при скрытии
	 * @param name - для каких блоков применяется расширение
	 * @returns {*}
	 */
	addOnFn: function (onShow, onHide, name) {

		this.getBlocks(name).each(function (block) {

			if (onShow) {
				block.onShow = onShow;
			}

			if (onHide) {
				block.onHide = onHide;
			}

		}, this);

		return this;

	},

	/**
	 * Добавляет вызов функции(displayAllowedFn) при показе блока,
	 * проверяющую возможность показа
	 * @param displayAllowedFn - передаваемая функция
	 * @param name - имя для выбора нужных блоков
	 * @returns {*}
	 */
	addDisplayAllowedFn: function (displayAllowedFn, name) {

		this.getBlocks(name).each(function (block) {

			if (displayAllowedFn) {
				block.displayAllowedFn = displayAllowedFn;
			}

		}, this);

		return this;
	},

	_isDisplayAllowed: function (show_blocks, e) {
		return this.parent(show_blocks) && show_blocks.every(function (block) {
			return !block.displayAllowedFn || block.displayAllowedFn(block, e);
		});
	},

	_showBlock: function (block) {
		block.onShow && block.onShow(block);
		this.parent(block);
		this.fireEvent('Show', block);
	},

	_hideBlock: function (block) {
		block.onHide && block.onHide(block);
		this.parent(block);
		this.fireEvent('Hide', block);
	}

});

ActiveBlocks_class.implement(new Events());

/**
 * Позволяет отключать/включать блоки, отключенные блоки не будут отображаться.
 *
 */
var DynamicBlocks_class = ActiveBlocks_class.extend({

	Class: 'DynamicBlocks_class',

	/**
	 * Прячет блок и помечает его disabled
	 * @param name
	 */
	disableBlock: function (name) {
		this.getBlocks(name).each(function (block) {
			block.disabled = true;
			if (block.active) {
				var first_enable = this.getBlocks(true).shift();
				first_enable && this._showBlock(first_enable);
			}
			this._hideBlock(block);
			block.handler && block.handler.hide();
			//App.log('disableBlock', block, this.getBlocks(true));
		}, this);

	},

	/**
	 * Показывает блок и помечает его как не disabled
	 * @param name
	 */
	enableBlock: function (name) {
		this.getBlocks(name, true).each(function (block) {
			block.disabled = false;
			block.handler && block.handler.show();
			//App.log('enableBlock', block);
		}, this);
	},

	getBlocks: function (name, with_disabled) {
		return with_disabled
			? this.parent(name)
			: this.parent(name).filter(function (block) {
				return !block.disabled;
			});
	},

	/**
	 * Выбирает все имена блоков
	 * @returns {Array}
	 */
	getBlockNames: function () {
		var block_names = [];
		this.getBlocks(true, true).each(function (block) {
			block_names.push(block.name);
		});
		return block_names;
	}

});
