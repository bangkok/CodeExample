<?php
/**
 * Created by PhpStorm.
 * User: konstantin
 * Date: 15.01.15
 * Time: 14:47
 */

const MODEL_TYPE = 0;
const CRITERIA_TYPE = 1;
const ARRAY_TYPE = 2;
const IDS_TYPE = 3;

trait MtModelFindAsArrayTrait {

    public static function getCursorAsArray(EMongoDocument $model, $fn)
    {
        $useCursor = $model->getUseCursor();
        $model->setUseCursor(TRUE);

        $result = $fn($model)->getCursor();

        $model->setUseCursor($useCursor);
        return $result;
    }

    /**
     * @param null $criteria
     * @return MongoCursor
     */
    public function findAllAsArray($criteria = NULL)
    {
        /** @var EMongoDocument $this */
        $useCursor = $this->getUseCursor();
        $this->setUseCursor(TRUE);

        $result = $this->findAll($criteria)->getCursor();

        $this->setUseCursor($useCursor);
        return $result;
    }

    public function findAsArray(EMongoCriteria $criteria = NULL)
    {
        return $this->getCollection()->findOne($criteria->getConditions(), $criteria->getSelect());
    }

    /**
     * @param EMongoCriteria $criteria
     * @param string $group
     * @return array
     */
    public function findAllIds(EMongoCriteria $criteria = null, $group = '')
    {
        $id = property_exists($this, 'id') ? 'id' : '_id';
        $select = [$id];
        if ($group) {
            array_push($select, $group);
        }
        $cursor = $this->findAllAsArray($criteria->select($select));

        return $group
            ? ArrayHelper::groupByAttribute($cursor, $group, $id)
            : ArrayHelper::pickAttribute($cursor, $id, false);
    }

    /**
     * @param EMongoCriteria $criteria
     * @param $returnType
     * @return array|EMongoCriteria|MongoCursor
     */
    protected function _returnByType(EMongoCriteria $criteria, $returnType)
    {
        /** @var EMongoDocument $this */
        switch (true) {
            case ($returnType === CRITERIA_TYPE) :
            case ($returnType === 'CRITERIA') :
                $result = $criteria;
                break;
            case ($returnType === ARRAY_TYPE) :
            case ($returnType === 'ARRAY') :
                $result = $this->findAllAsArray($criteria);
                break;
            case ($returnType === IDS_TYPE) :
            case ($returnType === 'IDS') :
                $result = $this->findAllIds($criteria);
                break;
            case ($returnType === MODEL_TYPE) :
            case ($returnType === 'MODEL') :
            default:
                $result = $this->findAll($criteria);
        }

        return $result;
    }

}