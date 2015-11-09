<?php

class MoneyFormat
{
    const TS = ' '; // THOUSANDS SEPARATOR

    protected static $_base = 100;

    public static function format($value, $ts = self::TS)
    {
        return number_format((float) round($value, 2), 2, '.', $ts);
    }
    public static function toDollarFormat($value)
    {
        return self::format(self::_to('Dollar', $value));
    }

    public static function toDollar($value)
    {
        return self::_to('Dollar', $value);
    }
    public static function toCent($value)
    {
        return self::_to('Cent', $value);
    }

    public static function arrayToDollar(array $values, array $keys = NULL)
    {
        return self::_arrayTo('Dollar', $values, $keys);
    }
    public static function arrayToCent(array $values, array $keys = NULL)
    {
        return self::_arrayTo('Cent', $values, $keys);
    }

    public static function attributesToDollar($modelData, $attributes = NULL)
    {
        return self::_attributesTo('Dollar', $modelData, $attributes);
    }
    public static function attributesToCent($modelData, $attributes = NULL)
    {
        return self::_attributesTo('Cent', $modelData, $attributes);
    }

    protected static function _to($dimension, $value)
    {
        $convertTo = '_convertTo'. $dimension;
        $_value = $value;

        if (is_string($value)) $_value = self::_prepareString($value);

        if (is_numeric($_value)) {
            return self::$convertTo($_value);
        } else {
            //:TODO Notice
            return $value;
        }
    }

    protected static function _arrayTo($dimension, array $values, array $keys = NULL)
    {
        $keys = is_null($keys) ? array_keys($values) : array_intersect($keys, array_keys($values));

        foreach ($keys as $key) {
            $values[$key] = self::_to($dimension, $values[$key]);
        }

        return $values;
    }

    protected static function _attributesTo($dimension, $modelData, $attributes = NULL)
    {
        $attributes = self::_parseMoneyAttributes($modelData, $attributes);

        foreach ($attributes as $key => $attribute) {
            $name = is_string($key) ? $key : $attribute;
            if (empty($modelData[$name])
                and !is_object($modelData) || empty($modelData->$name)
            ) {
                continue;
            }
            $value = $modelData[$name];

            if (is_array($attribute)) {
                if (!ArrayHelper::isAssoc($attribute, true)) {

                    $modelData[$name] = self::_arrayTo($dimension, $value, $attribute);

                } elseif (is_array($value) or is_object($value)) {

                    $modelData[$name] = self::_attributesTo($dimension, $value, $attribute);
                } else {
                    $modelData[$name] = self::_to($dimension, $value);
                }
            } else {
                if (is_array($value)) {
                    $modelData[$name] = self::_arrayTo($dimension, $value);
                } else {
                    $modelData[$name] = self::_to($dimension, $value);
                }
            }
        }
        return $modelData;
    }

    protected static function _convertToCent($value)
    {
        $_value = $value * self::$_base;
        return fmod($_value, 1)
            ? $_value
            : (int) $_value;
    }
    protected static function _convertToDollar($value)
    {
        $_value = $value / self::$_base;
        return is_integer($value) && is_float($_value)
            ? round($_value, 2)
            : $_value;
    }

    protected static function _prepareString($str)
    {
        return str_replace(array(',', ' ', "\t", '&nbsp;', '&thinsp;'), array('.'), $str);
    }

    private static function _parseMoneyAttributes($modelData, $attributes)
    {
        if (is_null($attributes)
            and is_object($modelData)
            and method_exists($modelData, 'moneyAttributes')
        ) {
            $attributes = $modelData->moneyAttributes();

        } elseif (is_object($attributes)
            and method_exists($attributes, 'moneyAttributes')
        ) {
            $attributes = $attributes->moneyAttributes();
        }
        return $attributes;
    }
}
