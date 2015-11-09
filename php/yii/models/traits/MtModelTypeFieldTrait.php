<?php
/**
 * Created by PhpStorm.
 * User: konstantin
 * Date: 22.04.15
 * Time: 14:19
 */

trait MtModelTypeFieldTrait {

    private $_fieldInstances = [];

    private $_typeAttributes;


    public function init()
    {
        parent::init();

        foreach($this->_getTypeAttributes() as $attribute => $type) {

            if (is_array($type) and isset($type['class'])) {

                $this->getField($attribute);
            }
        }
    }

    /**
     * @param $name
     * @return null | MtBaseField
     * @throws Exception
     */
    public function getField($name)
    {
        if (!array_key_exists($name, $this->_fieldInstances)
            and $types = $this->types()
            and isset($types[$name])
            and !empty($types[$name]['class'])
            and class_exists($fieldClassName = $types[$name]['class'])
        ) {

            if (!is_subclass_of($fieldClassName, 'MtBaseField')) {
                throw new Exception('Class '. $fieldClassName .' must implements MtBaseField');
            }
            unset($types[$name]['class']);
            $this->_fieldInstances[$name] = new $fieldClassName($this, $name, $types[$name]);

        } elseif (!array_key_exists($name, $this->_fieldInstances)) {

            $this->_fieldInstances[$name] = NULL;
        }

        return $this->_fieldInstances[$name];
    }

    /**
     * @return array
     */
    public function types()
    {
        return [];
    }

    public function prepareForView($names = NULL)
    {
        foreach($this->_getTypeAttributes($names) as $attribute => $type) {

            $this->$attribute = $this->_getTypeValueForView($attribute, $type);
        }
        return $this;
    }

    public function prepareForSave($names = NULL)
    {
        foreach($this->_getTypeAttributes($names) as $attribute => $type) {

            $this->$attribute = $this->_getTypeValueForSave($attribute, $type);
        }
        return $this;
    }

    /**
     * @param null $attributes
     * @param bool $clearErrors
     * @return bool
     */
    public function validate($attributes = NULL, $clearErrors = TRUE)
    {
        $isValid = TRUE;
        if ($clearErrors) $this->clearErrors();

        foreach ($this->_fieldInstances as $name => $field) {

            $value = $attributes
                ? MtModelDotNameAttributeTrait::getDotNameAttribute($attributes, $name)
                : $this->$name;

            $isValid &= (bool) $field->validate($value);
        }

        return $isValid && parent::validate($attributes, FALSE);
    }

    private function _getTypeValueForSave($attribute, $type)
    {
        $value = $this->$attribute;
        if (is_string($type) and function_exists($fnName = strtolower($type))) {

            if (is_scalar($value) and !is_bool($value)) {
                $value = $fnName($value);
            }

        } elseif ($type == 'MongoId') {

            $value = MtMongoCriteria::toMongoId($value);

        } elseif (is_array($type) and $field = $this->getField($attribute)) {

            $value = $field->getValueForSave($value);

        }
        return $value;
    }

    private function _getTypeValueForView($attribute, $type)
    {
        $value = $this->$attribute;
        if (is_array($type) and $field = $this->getField($attribute)) {

            $value = $field->getValueForView($value);
        }
        return $value;
    }

    private function _getTypeAttributes(array $names = NULL)
    {
        if ($this->_typeAttributes === NULL) {
            $this->_typeAttributes = [];

            foreach($this->types() as $attributes => $type) {

                foreach($this->_parseCommaString($attributes) as $attribute) {

                    $this->_typeAttributes[$attribute] = $type;
                }
            }
        }
        return $names
            ? array_intersect_key($this->_typeAttributes, array_flip($names))
            : $this->_typeAttributes;
    }

    private function _parseCommaString($CommaString)
    {
        return array_filter(array_map('trim', explode(',', $CommaString)));
    }

    public function getConditions(EMongoCriteria $criteria) {

        return $this->_walkConditions($criteria->getConditions(NULL, FALSE));
    }

    private function _walkConditions($conditions)
    {
        if (!is_array($conditions)) return $conditions;

        foreach ($conditions as $key => $condition) {

            if ($types = $this->_getTypeAttributes() and isset($types[$key])) {

                $conditions[$key] = $this->_prepareCondition($condition, $key, $types[$key]);
            } else {

                $conditions[$key] = $this->_walkConditions($condition);
            }
        }

        return $conditions;
    }

    private function _prepareCondition($condition, $attribute, $type)
    {
        if (is_string($type) and function_exists($fnName = strtolower($type))) {

            $prepare = function($condition) use ($fnName) {
                if (is_scalar($condition) and !is_bool($condition)) {
                    $condition = $fnName($condition);
                }
                return $condition;
            };

            $condition = is_array($condition)
                ? array_map($prepare, $condition)
                : $prepare($condition);

        } elseif ($type == 'MongoId') {

            $condition = MtMongoCriteria::toMongoId($condition);

        } elseif (is_array($type) and $field = $this->getField($attribute)) {

            $condition = is_array($condition)
                ? array_map([$field, 'prepareCondition'], $condition)
                : $field->prepareCondition($condition);
        }

        return $condition;
    }
}