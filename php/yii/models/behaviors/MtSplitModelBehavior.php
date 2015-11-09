<?php
/**
 * Created by PhpStorm.
 * User: konstantin
 * Date: 22.04.15
 * Time: 16:00
 */

class MtSplitModelBehavior extends MtDotNameAttributeBehavior
{

    protected $_splitAttributes = [];

    /**
     * @param array $variants
     * @param string $nameField
     * @return array
     */
    public function getSplitModels(array $variants = null, $nameField = 'name')
    {
        $splitModels = [];
        $variants = is_null($variants) ? $this->getSplitVariants() : $variants;

        foreach ($variants as $values) {

            $splitModel = $this->owner->duplicate();

            foreach ($values as $name => $value) {

                $splitModel[$name] = $value;
            }

            if ($nameField and isset($splitModel[$nameField])) {
                $splitModel[$nameField] = $this->getSplitModelName($splitModel[$nameField], $values);
            }

            $splitModel->afterSplitCreate();

            $splitModels[] = $splitModel;
        }

        return $splitModels;
    }

    public function afterSplitCreate()
    {

    }

    public function getSplitModelName($name, array $values)
    {
        $name .= ' '.
        join(', ', array_map(function($names) use ($values) {

            $items = array_intersect_key($values, array_flip($this->_parseCommaString($names)));

            if (is_array(reset($items))) {
                $items = array_unchunk($items);
            }

            $items = array_map(function($item) {
                return preg_replace('/^\d+'. FacebookTargetableBehavior::ID_NAME_DELIMITER .'/', '', $item);
            }, $items);

            return join('-', $items);

        }, $this->_splitAttributes));

        return trim($name);
    }

    /**
     * @param null $values
     * @return array
     */
    public function getSplitData($values = null)
    {
        $data = [];
        $values = is_null($values) ? $this->owner : $values;

        foreach ($this->_splitAttributes as $names) {

            $splitItem = [];
            foreach ($this->_parseCommaString($names) as $name) {

                foreach ($values[$name] ?: [] as $n => $value) {

                    $splitItem[$n][$name] = $value;
                }
            }
            $data[] = $splitItem;
        }

        return $data;
    }

    /**
     * @param $splitData
     * @return array
     */
    public function getSplitVariants(array $splitData = null)
    {
        $result = [[]];
        $splitData = is_null($splitData) ? $this->getSplitData() : $splitData;

        foreach($splitData as $item) {

            $result = $this->_multiply($result, $item);
        }

        return $result;
    }

    private function _multiply(array $splitItem, array $splitItem2)
    {
        $result = [];
        foreach ($splitItem as $item) {

            foreach ($splitItem2 as $item2) {

                $result[] = array_merge($item, $item2);

            }
        }
        return $result;
    }

    public function getSplitAttributes()
    {
        return $this->_splitAttributes;
    }

    public function setSplitAttributes(array $value)
    {
        $this->_splitAttributes = $value;
    }

    /**
     * @param CModel $model
     * @param array $splitAttributes
     * @param array $models
     * @return bool
     */
    public static function saveSplitModels(CModel $model, array $splitAttributes, &$models = [])
    {
        $isAllModelsSaved = false;

        $model->attachBehavior(__CLASS__, 'application.models.'. __CLASS__);

        $model->setSplitAttributes($model->getSplitAttributes());

        $models = $model->getSplitModels();

        if ($model->validateModels($models)) {

            $isAllModelsSaved = $model->saveModels($models, false, null, true);
        }

        return $isAllModelsSaved;
    }

    /**
     * @param $models
     * @return bool
     */
    public function validateModels($models) {

        $result = (bool) count($models);
        foreach ($models as $model) {

            if (!$model->validate()) {

                $result && $this->owner->clearErrors();

                $this->owner->addErrors($model->getErrors());

                $result = false;

                break;
            }
        }

        return $result;
    }

    /**
     * @param $models
     * @param bool $runValidation
     * @param array|null $attributes
     * @param bool $makeRequest
     * @return bool
     */
    public function saveModels($models, $runValidation = true, $attributes = null, $makeRequest = false) {

        $result = (bool) count($models);
        foreach ($models as $model) {

            if (!$model->save($runValidation, $attributes, $makeRequest)) {

                $result = false;

                $this->owner->addErrors($model->getErrors());
            }
        }

        return $result;
    }

    public function resetSplitValues()
    {
        foreach ($this->splitAttributes as $names) {

            foreach ($this->_parseCommaString($names) as $name) {

                $values = $this->owner[$name];

                if (is_array($values)) {
                    $this->owner[$name] = reset($values);
                }
            }
        }
    }

    public function duplicate()
    {
        $class = get_class($this->owner);

        $model = new $class($this->owner->getScenario());

        $model->setAttributes($this->owner->toArray(), FALSE);

        $model->attachBehavior(__CLASS__, 'application.models.'. __CLASS__);

        return $model;
    }

    private function _parseCommaString($CommaString)
    {
        return array_filter(array_map('trim', explode(',', $CommaString)));
    }
}