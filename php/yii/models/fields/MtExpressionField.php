<?php
/**
 * Created by PhpStorm.
 * User: konstantin
 * Date: 26.12.14
 * Time: 13:43
 */

class MtExpressionField extends MtBaseField {

    private static $_compare_operators = ['==', '!=', '<>', '<=', '>=', '<', '>'];
    //private static $_arithmetic_operators = ['+', '-', '*', '/'];
    protected static $_spaces = '\s*';
    protected static $_varCleanReg = '/\W/';
    protected static $_valueCleanReg = '/[^\w\.\/{:}]/';

    public function getValueForView($value)
    {
        return $this->toArray($value);
    }

    public function valueToArray()
    {
        $value = $this->getValue();

        return !is_array($value)
            ? static::toArray($value)
            : $value;
    }

    public function valueToString()
    {
        $value = $this->getValue();

        return !is_string($value)
            ? static::toString($value)
            : $value;
    }

    public static function toArray($value)
    {
        return static::_stringToArray($value);
    }

    public static function toString(array $value)
    {
        return is_array($value) ? static::_arrayToString($value) : '';
    }

    protected static function _stringToArray($value)
    {
        $matches = [];
        if (!empty($value) and is_string($value)) {

            preg_match(static::_getReg(), $value, $matches);
        };

        return static::_matchesToArray($matches);
    }

    protected static function _getReg()
    {
        $opsReg = static::_getRegOperators();
        $ops = array_map('preg_quote', static::_getOperators());
        $ops = join('|', array_merge($opsReg, $ops));
        $s = self::$_spaces;

        return "/^{$s}({.*}){$s}({$ops})(.*?)$/";
    }

    protected static function _getRegOperators()
    {
        return [];
    }

    protected static function _getOperators()
    {
        return self::$_compare_operators;
    }

    protected static function _matchesToArray($matches)
    {
        $result = ['var'=>NULL, 'op'=>NULL, 'value'=>NULL];
        if (!empty($matches)) {
            $result['var'] = preg_replace(static::$_varCleanReg, '', $matches[1]);
            $result['op'] = trim($matches[2]);
            $result['value'] = preg_replace(static::$_valueCleanReg, '', $matches[3]);
        }
        return $result;
    }

    protected static function _arrayToString($expr)
    {
        $result = '{'. $expr['var'] .'} '. $expr['op'];

        if (strlen(trim($expr['value']))) {

            $result .= ' '. "'{$expr['value']}'";
        }
        return trim($result);
    }

} 