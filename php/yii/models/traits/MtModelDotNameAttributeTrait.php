<?php
/**
 * Created by PhpStorm.
 * User: konstantin
 * Date: 22.04.15
 * Time: 14:12
 */

trait MtModelDotNameAttributeTrait {
    protected static $_delimiter = '.';

    public static function isDotNameAttribute($attributeName, $delimiter = '') {
        $delimiter = strlen($delimiter) ? $delimiter : static::$_delimiter;

        return strpos($attributeName, $delimiter) !== FALSE;
    }

    public static function dotNameToFormName($attributeName, $delimiter = '') {
        $delimiter = strlen($delimiter) ? $delimiter : static::$_delimiter;

        return '[' . str_replace($delimiter, '][', $attributeName) . ']';
    }

    public function __get($name)
    {
        try {
            return parent::__get($name);

        } catch (Exception $e) {

            if (self::isDotNameAttribute($name)) {

                return self::getDotNameAttribute($this, $name);
            }
            throw $e;
        }
    }

    public function __set($name, $value)
    {
        try {
            return parent::__set($name, $value);

        } catch (Exception $e) {

            if (self::isDotNameAttribute($name)) {

                return self::setDotNameAttribute($this, $name, $value);
            }
            throw $e;
        }
    }

    public function __isset($name) {

        $result = parent::__isset($name);

        if (!$result and self::isDotNameAttribute($name)) {

            $result = !is_null(self::getDotNameAttribute($this, $name));
        }
        return $result;
    }

    /**
     * @param $that
     * @param $name
     * @param $value
     * @param string $delimiter
     * @param bool $setIfNotExists
     * @return mixed
     */
    final public static function setDotNameAttribute(&$that, $name, $value, $delimiter = '', $setIfNotExists = true)
    {
        $delimiter = strlen($delimiter) ? $delimiter : static::$_delimiter;
        $tok = strtok($name, $delimiter);

        if (empty($that) and $setIfNotExists) {
            $that = [];
        }
        if (is_array($that)) {
            if (array_key_exists($tok, $that)) {

                $attribute = &$that[$tok];

            } elseif ($setIfNotExists) {

                $that[$tok] = null;
                $attribute = &$that[$tok];
            } else {

                return null;
            }
        } elseif (is_object($that)) {
            if (property_exists($that, $tok)) {

                $attribute = &$that->$tok;

            } elseif (isset($that->$tok)) { //method access

                $val = $that->$tok;

                self::setDotNameAttribute($val, strtok(''), $value, $delimiter, $setIfNotExists);

                $that->$tok = $val;

                return $val;
            }
        } else {
            return null;
        }

        while (FALSE !== ($tok = strtok($delimiter))) {

            if (empty($attribute) and $setIfNotExists) {
                $attribute = [];
            }
            if (is_array($attribute)) {
                if (array_key_exists($tok, $attribute)) {

                    $attribute = &$attribute[$tok];

                } elseif ($setIfNotExists) {

                    $attribute[$tok] = null;
                    $attribute = &$attribute[$tok];
                } else {

                    return null;
                }
            } elseif (is_object($attribute)) {
                if (property_exists($attribute, $tok)) {

                    $attribute = &$attribute->$tok;

                } elseif (isset($attribute->$tok)) { //method access

                    $val = $attribute->$tok;

                    self::setDotNameAttribute($val, strtok(''), $value, $delimiter, $setIfNotExists);

                    $attribute->$tok = $val;

                    return $val;
                }
            } else {
                return null;
            }
        }
        return $attribute = $value;
    }

    /**
     * @param $that
     * @param $name
     * @param string $delimiter
     * @return null
     */
    final public static function getDotNameAttribute($that, $name, $delimiter = '')
    {
        if (isset($that->attributes[$name])) {
            return $that->attributes[$name];
        }

        $delimiter = strlen($delimiter) ? $delimiter : static::$_delimiter;
        $tok = strtok($name, $delimiter);

        if (isset($that[$tok])) {

            if (is_object($that)) $attribute = &$that->$tok;
            else $attribute = &$that[$tok];

        } elseif (isset($that->$tok)) { //method access

            $attribute = $that->$tok;
        } else {

            return NULL;
        }

        while (FALSE !== ($tok = strtok($delimiter)) and $attribute) {

            if (isset($attribute[$tok])) {

                if (is_object($attribute)) $attribute = &$attribute->$tok;
                else $attribute = &$attribute[$tok];

            } elseif (isset($attribute->$tok)) { //method access

                $attribute = $attribute->$tok;
            } else {

                return NULL;
            }
        }
        return $attribute;
    }

    public static final function setDotNameAttributes(&$that, $data, $delimiter = '', $setIfNotExists = true)
    {
        foreach($data as $name => $value) {
            static::setDotNameAttribute($that, $name, $value, $delimiter, $setIfNotExists);
        }
    }
}