<?php
/**
 * Created by PhpStorm.
 * User: konstantin
 * Date: 05.12.14
 * Time: 16:28
 */

class MtDateTimeField extends MtBaseField {

    public function getValueForSave($value)
    {
        $timestamp = NULL;
        if (is_array($value)) {
            $value = trim(join(' ', $value));
        }

        if (is_numeric($value)) {

            $timestamp = (int) $value;

        } elseif (is_string($value)) {

            $timestamp = strtotime($value);

        } elseif (is_object($value) and $value instanceof DateTime) {

            $timestamp = $value->getTimestamp();
        }
        return $timestamp;
    }

    public function getValueForView($value)
    {
        $result = is_numeric($value) ? [
            'date' => $value ? date('Y-m-d', $value) : '',
            'time' => $value ? date('H:i', $value) : ''
        ] : $value;
        return $result;
    }

    public function validate($value = NULL)
    {
        $isValid = TRUE;
        if (is_array($value)) {
            $value = trim(join(' ', $value));
        }
        if ($value and !$this->getValueForSave($value)) {
            $isValid = FALSE;

            $this->addError('{attribute}, The date is incorrect.');
        }
        return $isValid;
    }

    public function isEmpty()
    {
        return empty($this->getValue()['date']);
    }

} 