<?php
/**
 * Created by PhpStorm.
 * User: konstantin
 * Date: 30.04.15
 * Time: 14:47
 */

class MtDotNameAttributeBehavior extends EMongoDocumentBehavior {

    public function __get($name)
    {
        try {
            return parent::__get($name);

        } catch (Exception $e) {

            if (strpos($name, '.') !== FALSE) {

                return MtModelDotNameAttributeTrait::getDotNameAttribute($this->owner, $name);
            }
            throw $e;
        }
    }

    public function __set($name, $value)
    {
        try {
            return parent::__set($name, $value);

        } catch (Exception $e) {

            if (strpos($name, '.') !== FALSE) {

                return MtModelDotNameAttributeTrait::setDotNameAttribute($this->owner, $name, $value);
            }
            throw $e;
        }
    }

    public function canGetProperty($name)
    {
        return parent::canGetProperty($name)
        or strpos($name, '.') !== FALSE
        and !$this->owner instanceof MtModelDotNameAttributeTrait;

    }
    public function canSetProperty($name)
    {
        return parent::canSetProperty($name)
        or strpos($name, '.') !== FALSE
        and !$this->owner instanceof MtModelDotNameAttributeTrait;
    }
}