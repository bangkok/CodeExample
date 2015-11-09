<?php
/**
 * Created by PhpStorm.
 * User: konstantin
 * Date: 17.12.14
 * Time: 15:42
 */

class MtStringConditionField extends MtBaseField {

    private static $_tags = ['(', ')'];
    private static $_logic_operators = ['&&', '||', '&', '|'];
    private static $_spaces = '\s*';
    private static $_re;

    private $_old_value;

    public function init()
    {
        if ($this->model) {
            $this->model->attachEventHandler('onBeforeValidate', [$this, 'onBeforeValidate']);
            $this->model->attachEventHandler('onAfterValidate', [$this, 'onAfterValidate']);
        }
    }

    public function onBeforeValidate($event)
    {
        $value = $this->getValue();
        if (is_array($value)) {
            $this->_old_value = $value;

            $this->setValue(self::toString($value));
        }
    }

    public function onAfterValidate($event)
    {
        if ($this->model and $this->model->hasErrors()) {
            $this->value = $this->_old_value;
        }
        $this->_old_value = NULL;
    }

    public function getConditions()
    {
        return is_string($this->value)
            ? self::toArray($this->value)
            : $this->value;
    }

    public static function toArray($value = NULL)
    {
        return self::_stringToArray($value) ?: [];
    }

    public static function toString(array $value)
    {
        return self::_arrayToString($value) ?: '';
    }

    public static function expressionWalk(&$conditions, &$callback)
    {
        if (is_array($conditions)) {
            foreach ($conditions as &$condition) {
                self::expressionWalk($condition, $callback);
            }
        } else {
            call_user_func($callback, $conditions);
        }
    }

    public function formDataToConditions(array $data)
    {
        $data = self::_prepareFormData($data);

        $logic = '';
        $conditions = $cursor = [];
        $cursor[1] = &$conditions;
        $prevLevel = 1;
        foreach ($data as $dataItem) {
            $level = key($dataItem);
            $item = reset($dataItem);

            if ($prevLevel < $level) {
                for($i = $prevLevel; $i < $level; $i++) {
                    $cursor[$i+1] = &$cursor[$i][][$logic];
                    $logic = '';
                }
            }
            if (key($item) == 'logic') {
                $logic = ' '. current($item) .' ';
            } else {
                $cursor[$level][][$logic] = $this->getExpressionField($item)->valueToString();
            }
            $prevLevel = $level;
        }

        return $conditions;
    }

    public function getExpressionField($expr = NULL)
    {
        return MtExpressionField::getField($expr);
    }

    private static function _stringToArray($value, $operator = NULL)
    {
        $conditions = [];
        if (preg_match_all(self::_getReg(), $value, $matches)
            and !empty($matches[3])
        ) {
            foreach ($matches[3] as $i => $match) {
                $conditions[] = self::_stringToArray($match, $matches[1][$i]);
            }
        } else {
            $conditions = $value;
        }
        return is_string($operator) ? [$operator => $conditions] : $conditions;
    }

    private static function _arrayToString($conditions, $operator = NULL, $callback = NULL)
    {
        $str = '';
        if (is_array($conditions)) {
            foreach ($conditions as $key => $condition) {
                $str .= self::_arrayToString($condition, is_string($key) ? $key : NULL, $callback);
            }
        } else {
            $str = is_callable($callback)
                ? call_user_func($callback, $conditions)
                : $conditions;
        }

        return is_string($operator) && $str ? "$operator($str)" : $str;
    }

    private static function _getReg()
    { /* '/ \( ((?: | (?>[^()]+) | (?R) )*) \) /x'  - origin reg */
        if (is_null(self::$_re)) {
            list($ot, $ct) = array_map('preg_quote', self::$_tags);
            $s = self::$_spaces;
            $ops = join('|', array_map('preg_quote', self::$_logic_operators));

            self::$_re = "/ ({$s}(?:{$ops}){$s})?+ (?<!\\w)({$ot}((?: [^{$ot}{$ct}]++ | (?2) )*){$ct}) /x";
        }
        return self::$_re;
    }

    private static function _prepareFormData(array $data)
    {
        $condition = $conditions = [];
        $prevLevel = 1;
        for ($i=0; isset($data[$i]); $i++) {

            $condition = array_merge_recursive($condition, reset($data[$i]));

            if ($prevLevel > key($data[$i])
                or !isset($data[$i+1])
                or key(reset($data[$i])) == 'logic'
                or key(reset($data[$i+1])) == 'logic'
            ) {
                if (trim(join('', array_filter($condition, 'is_string')))) {
                    $conditions[][key($data[$i])] = $condition;
                }
                $condition = [];
            }
            $prevLevel = key($data[$i]);
        }
        return $conditions;
    }

}