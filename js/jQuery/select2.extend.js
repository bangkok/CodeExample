/*
For select2 Version 3.5.0
*/

(function($){

    var defaultMultiSelect2Init = Select2.class.multi.prototype.init;

    Select2.class.multi.prototype.init = function (opts) {
        var result = defaultMultiSelect2Init.apply(this, arguments);
        this.opts.element.trigger('select2-init', this);
        return result;
    };

    var defaultMultiSelect2Destroy = Select2.class.multi.prototype.destroy;

    Select2.class.multi.prototype.destroy = function (opts) {
        if (this.opened()) {
            this.select.data('select2-reInitSearch', this.search.val());
        }
        return defaultMultiSelect2Destroy.apply(this, arguments);
    };

    $.fn.select2.defaults = $.extend({
        allowClear: true,
        selectTags: false,
        reInitSearch: true,
        setEmptyValue: true,
        setEmptyValueOnInit: true
    }, $.fn.select2.defaults);

    var defaultTokenSeparators = [',', '\\t+'];

    $(document).on('select2-init', function(e, select2) {

        var opts = select2.opts;

        extendSelectOpts.call(select2);

        if (isSelect(opts.element)) {

            if (!opts.tokenSeparators.length) {
                opts.tokenSeparators = defaultTokenSeparators;
            }
            if (opts.tokenSeparators.length) {
                initSelectTokenizer.call(select2);
            }

            if(opts.allowClear) {
                initClearable.call(select2)
            }

            initOnDblClickSearch.call(select2);


            if (opts.lazyAjax) {
                initLazyAjax.call(select2);
            }

            if (opts.reInitSearch) {
                setReInitSearch.call(select2);
            }

            if (opts.selectTags) {
                initOnNotFoundSelectWithTagsOption.call(select2);
            }

            if (opts.setEmptyValue) {
                initSetEmptyValue.call(select2);
            }

            $(document).on('select2-close_other', function(e) {
                if (select2.opened() && select2.select[0] !== e.target) {
                    select2.close();
                }
            });
        }
    });

    /**
     * Set json options from data-select2-opts attribute
     */
    var extendSelectOpts = function() {
        var opts = this.opts.element.data('select2Opts');
        if (opts) {
            $.extend(this.opts, opts);
        }
    };

    /**
     * Set values by token string
     */
    var initSelectTokenizer = function() {
        var defaultTokenizer = this.opts.tokenizer;
        this.opts.tokenizer = function () {
            var result = defaultTokenizer.apply(this, arguments);
            if (result === undefined) {
                result = selectTokenizer.apply(this, arguments);
            }
            return result;
        };
    };
    var selectTokenizer = function(input, selection, selectCallback, opts) {
        var result, token, term, i, j, option, changeFlag;

        if (opts.tokenSeparators && opts.tokenSeparators.length > 0) {

            token = splitToken(input, opts.tokenSeparators, true);
            result = input;

            if (token.length) {
                changeFlag = false;
                for (i = 0; i < this.select[0].length; i++) {
                    term = '';
                    option = $(this.select[0][i]);

                    if (this.val().indexOf(option.val()) != -1) continue;

                    for (j = 0; j < token.length; j++) {
                        if (option.text().trim().toLowerCase() === token[j].toLowerCase()) {
                            term = token[j];
                            break;
                        }
                    }

                    if (term) {
                        this.setVal(this.getVal().concat(option.val()));
                        changeFlag = true;
                        result = replaceTerm(result, term, opts.tokenSeparators);
                    }
                }
                if (changeFlag) {
                    this.val(this.val(), true);
                }
            }
        }
        return result;
    };
    var splitToken = function(token, sep, onlyWithSeparator) {
        var trim = function(el){return el.trim()};
        token = token.split($.isArray(sep) ? RegExp(sep.join('|')) : sep);
        return !onlyWithSeparator || token.length > 1
            ? token.filter(trim).map(trim)
            : [];
    };
    var replaceTerm = function(str, term, sep, val) {
        var reg = '(' + ['^'].concat(sep).join('|') + ')(\\s*)'
            + escape(term)
            + '(' + ['$', '\\s+'].concat(sep).join('|') + ')+';
        return str.replace(RegExp(reg), val || '$1$2');
    };
    var escape = function(s) {
        return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    };

    /**
     * Select values for copy on DblClick
     */
    var initOnDblClickSearch = function() {
        this.selection.on('dblclick', ':not(input)', setSearchForCopy.bind(this));
    };
    var setSearchForCopy = function(e) {
        this.doNotAjaxQuery = true;
        this.select.select2('search', getValueText(this.select));
        delete this.doNotAjaxQuery;
        this.search.select();
        this.selectChoice();
        e.preventDefault();
        e.stopPropagation();
    };
    var getValueText = function(element, separator) {
        return element.select2('data').map(function(item){
            return item.text;
        }).join(separator || ', ');
    };

    var initClearable = function() {
        var select2 = this;
        var clear = $('<abbr class="select2-search-choice-close"></abbr>').on('click', function() {
            var evt = $.Event("select2-clearing");
            select2.opts.element.trigger(evt);
            if (evt.isDefaultPrevented()) {
                return;
            }
            select2.val('', true);
        });
        var onChange = function() {
            if (select2.val().length) {
                clear.show();
                clear.closest('.select2-container').addClass('has-clear');
            } else {
                clear.hide();
                clear.closest('.select2-container').removeClass('has-clear');
            }
        };
        onChange();
        this.select.on('change.select2', onChange);
        this.container.addClass('select2-allowclear').prepend(clear);
    };

    /**
     * Request when search result no matches
     */
    var initLazyAjax = function() {
        var self = this, ajax, defaultFormatNoMatches = this.opts.formatNoMatches;
        this.opts.lazyAjax.defaults = {
            quietMillis: 500, // number of milliseconds to wait before invoking fn
            dataTextName: 'text',
            toLastGroup : false,
            results: function(data) {// parse the results into the format expected by Select2.
                // since we are using custom formatting functions we do not need to alter remote JSON data
                return data;
            },
            optionHtml: function(data) {
                return '<option value="'+ data.id +'"'
                    //+ (data.selected ? ' selected="selected"' : '')
                    +'>'+ data[this.dataTextName] +'</option>';
            },
            resultHtml: function(results) {
                var opts = this.opts.lazyAjax;
                return results.filter(function(item) {
                    return !opts.isValueExist(item.id);
                }).map(function(data) {
                    return opts.optionHtml(data);
                }).join('');
            },
            appendResults: function(results, element) {
                if (this.opts.lazyAjax.toLastGroup) element = element.find('optgroup:last');
                element.append(this.opts.lazyAjax.resultHtml.call(this, results));
            },
            isValueExist: function(val) {
                var i;
                for (i = 0; i < self.select[0].length; i++) {
                    if (self.select[0][i].value === val) return true;
                }
                return false;
            }
        };
        this.opts.lazyAjax = $.extend({}, this.opts.lazyAjax.defaults, this.opts.lazyAjax);
        ajax = Select2.query.ajax.call(self.opts.element, this.opts.lazyAjax);
        ajax.requestHist = {};

        this.opts.formatNoMatches = function (term) {

            if (self.opts.lazyAjax.minTermLength && term.length < self.opts.lazyAjax.minTermLength) {

                return self.opts.formatInputTooShort(term, self.opts.lazyAjax.minTermLength);

            } else if (term && !self.doNotAjaxQuery && LazyAjax.call(self, ajax, term)) {

                return self.opts.formatSearching();

            } else {

                return defaultFormatNoMatches.apply(this, arguments);

            }
        };
    };
    var LazyAjax = function (ajax, term) {
        var self = this, callback, query;

        if (ajax.requestHist[term] !== undefined)
            return !ajax.requestHist[term];

        callback = function (results) {

            ajax.requestHist[this.term] = results;

            self.opts.lazyAjax.callback && self.opts.lazyAjax.callback.apply(this, arguments);

            self.opts.lazyAjax.appendResults.call(self, results, self.opts.element);

            self.opts.initSelection(self.opts.element, function(data) {
                self.updateSelection(data);
                self.opening();
            });
        };

        ajax.requestHist[term] = false;

        query = $.extend({}, this.opts.lazyAjax, {
            term: term,
            callback: callback
        });

        ajax(query);

        return true;
    };

    var initOnNotFoundSelectWithTagsOption = function() {
        var that = this;
        this.search.on('keyup', function(e) {
            if (e.which == 13) {
                var value = that.search.val();

                if (value.length > 0) {
                    that.opts.element.append($('<option value="' + value + '">' + value + '</option>'));
                    that.val(that.val().concat(value), true);
                    that.close();
                }
            }
        });
    };

    var setReInitSearch = function() {
        var reInitSearch = this.select.data('select2-reInitSearch');
        if (reInitSearch || reInitSearch === '') {
            this.externalSearch(reInitSearch);
        }
    };

    var initSetEmptyValue = function() {

        if (this.select.val() || this.opts.setEmptyValueOnInit) {
            var select = this.select;
            var input = $('<input>').attr({
                name: select.attr('name').replace(/\[]$/, ''),
                type: 'hidden',
                disabled: !!select.val()
            });

            this.opts.setEmptyValueOnInit && select.before(input);

            select.on('change.select2', function() {
                input.prop('disabled', !!select.val());
                select.before(input);
            });
        }
    };

    var isSelect = function (element) {
        return $(element).get(0).tagName.toLowerCase() === "select";
    };

})(jQuery);



