<?php

/**
 * Class MtBaseMongoModel
 *
 * @var bool isNewRecord
 */
abstract class MtBaseMongoModel extends EMongoDocument
{
    use MtModelTypeFieldTrait,
        MtModelDotNameAttributeTrait,
        MtModelFindAsArrayTrait,
        MtModelFindExtendTrait,
        MtModelOldAttributesTrait;

    /**
     * @param string $className
     * @return static
     */
    public static function model($className = '')
    {
        return parent::model($className ?: get_called_class());
    }

    public function afterValidate()
    {
        parent::afterValidate();

        $this->onAfterValidate(new CEvent($this));
    }

    public static function toMongoId($id)
    {
        return MtMongoCriteria::toMongoId($id);
    }

    public function getMongoId()
    {
        return strval($this->_id);
    }

    public function duplicate(array $attributes = [])
    {
        $class = get_class($this);

        $model = new $class($this->getScenario());

        $model->setAttributes(array_merge($this->toArray(), ['_id' => NULL], $attributes), FALSE);

        return $model;
    }

}