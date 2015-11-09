<?php

class ArrayHelper
{

    /**
     * @param $collection
     * @param $attribute
     * @param null $index_key
     * @return array
     */
    public static function pickAttribute($collection, $attribute, $index_key = NULL)
    {
        $result = array();
        foreach ($collection as $key => $item) {
            $result[$index_key ? strval($item[$index_key]) : $key] = $attribute ? $item[$attribute] : $item;
        }
        return $index_key === FALSE ? array_values($result) : $result;
    }

    /**
     * This function can be used to reverse effect of array_chunk
     * @link http://php.net/manual/en/function.array-chunk.php
     *
     * @param [array] $array
     * @param bool $isSaveKeys
     * @return mixed
     */
    public static function unchunk(array $array, $isSaveKeys = false)
    {
        if ($isSaveKeys) {
            $result = [];
            foreach ($array as $item) {
                foreach ($item as $key => $val) {
                    $result[$key] = $val;
                }
            }
            return $result;
        }
        return !$array ? $array : call_user_func_array('array_merge', $array);
    }

    /**
     * @param $collection
     * @param $group
     * @param string $keyName
     * @return array
     */
    public static function groupByAttribute($collection, $group, $keyName = '') {
        $result = [];
        foreach ($collection as $item) {
            if (!isset($result[$item[$group]])) $result[$item[$group]] = [];
            $result[$item[$group]][] = $keyName ? $item[$keyName] : $item;
        }
        return $result;
    }

    /**
     * Tests if an array is associative or not.
     *
     * @param array $array
     * @param bool $fullCheck
     * @return bool
     */
    public static function isAssoc(array $array, $fullCheck = FALSE)
    {
        if ($fullCheck) {
            $keys = array_keys($array);
            return array_keys($keys) !== $keys;
        } else {
            return !isset($array[0]);
        }
    }

    /**
     * @param [array] $array
     * @return array
     */
    public static function swapLevels(array $array)
    {
        $result = [];
        foreach($array as $key1 => $value1) {
            foreach ($value1 as $key2 => $value2) {
                $result[$key2][$key1] = $value2;
            }
        }
        return $result;
    }

    /**
     * @param array $array
     * @param array $map ['search' => 'replace']
     * @return array
     */
    public static function replaceValues(array $array, array $map)
    {
        foreach ($map as $search => $replace) {
            if ($keys = array_keys($array, $search)) {
                $array = array_replace($array, array_fill_keys($keys, $replace));
            }
        }
        return $array;
    }

    /**
     * @param array $array
     * @param array $map ['search' => 'replace']
     * @return array
     */
    public static function replaceKeys(array $array, array $map)
    {
        foreach ($map as $search => $replace) {
            if (array_key_exists($search, $array)) {
                $array[$replace] = $array[$search];
                unset($array[$search]);
            }
        }
        return $array;
    }

}
