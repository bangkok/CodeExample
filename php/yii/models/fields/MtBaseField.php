<?php
/**
 * Created by PhpStorm.
 * User: konstantin
 * Date: 20.11.14
 * Time: 12:14
 */

class MtBaseField extends CComponent {

    public $model;

    protected $_attributeName;

    protected $_params;

    protected $_value;

    public function __construct(MtBaseMongoModel $model = NULL, $attributeName = NULL, $params = [])
    {
        $this->model = $model;
        $this->_attributeName = $attributeName;
        $this->_params = $params;
        $this->init();
    }

    public function init()
    {}

    public function getAttributeName()
    {
        return $this->_attributeName;
    }

    /**
     * @return mixed|null
     */
    public function getValue()
    {
        return $this->model
            ? $this->model->{$this->getAttributeName()}
            : $this->_value;
    }

    /**
     * @param $value
     */
    public function setValue($value)
    {
        $this->model
            ? $this->model->{$this->getAttributeName()} = $value
            : $this->_value = $value;
    }

    public static function getField($value)
    {
        $field = new static();

        $field->setValue($value);

        return $field;
    }

    /**
     * @param $value
     * @return mixed
     */
    public function getValueForSave($value)
    {
        return $value;
    }

    /**
     * @param $value
     * @return mixed
     */
    public function getValueForView($value)
    {
        return $value;
    }

    /**
     * @param mixed $value
     * @return bool
     */
    public function validate($value = NULL)
    {
        return TRUE;
    }

    /**
     * @param $condition
     * @return mixed
     */
    public function prepareCondition($condition)
    {
        return $condition;
    }

    protected function addError($message)
    {
        $message = str_replace('{attribute}', $this->model->getAttributeLabel($this->getAttributeName()), $message);
        $this->model->addError($this->getAttributeName(), $message);
    }
}