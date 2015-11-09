<?php
/**
 * Created by PhpStorm.
 * User: konstantin
 * Date: 09.01.15
 * Time: 17:15
 */

class MtDateIntervalField extends MtBaseField {

    const DATE_FORMAT = 'Y-m-d';
    const INTERVAL_DELIMITER = ' - ';

    public static function toArray($value, $timezone = null)
    {
        $interval = explode(self::INTERVAL_DELIMITER, $value);

        return [
            !empty($interval[0]) ? self::getStartDay(strtotime($interval[0])) : 0,
            !empty($interval[1]) ? self::getEndDay(strtotime($interval[1])) : self::getEndDay(null, $timezone)
        ];
    }

    public static function toString(array $value, $format = self::DATE_FORMAT)
    {
        return date($format, $value[0]) .' - '. date($format, $value[1]);
    }

    public static function getStartDay($time = NULL)
    {
        $time = is_null($time) ? time() : $time;
        return mktime(0,0,0, date('m', $time), date('d', $time), date('Y', $time));
    }
    public static function getEndDay($time = NULL, $timezone = null)
    {
        $time = is_null($time) ? time() : $time;
        $dateConverted = new DateTime();
        $date = $dateConverted->setTimestamp($time);

        if (!is_null($timezone)) {
            $date->setTimezone(new DateTimeZone($timezone));
        }

        return mktime(23,59,59, $date->format('m'), $date->format('d'), $date->format('Y'));
    }

    public static function getIntervals()
    {
        return [
            'today' => [MtDateIntervalField::getStartDay(), MtDateIntervalField::getEndDay()],
            'lifetime' => [0, MtDateIntervalField::getEndDay()]
        ];
    }

    public function getValueForView($value)
    {
        return $this->toString($value);
    }

    public function getValueForSave($value)
    {
        return $this->toArray($value);
    }

} 