<?php
/**
 * Created by PhpStorm.
 * User: konstantin
 * Date: 22.04.15
 * Time: 14:27
 */

trait MtModelFindExtendTrait {

    /**
     * @param $pk
     * @param null | array | EMongoCriteria $criteria
     * @return $this | null
     */
    public function findByPk($pk, $criteria = NULL)
    {
        /** @self EMongoDocument  */
        return parent::findByPk(MtMongoCriteria::toMongoId($pk), $criteria);
    }

    /**
     * @param $pk
     * @param null | array | EMongoCriteria $criteria
     * @return $this[]
     */
    public function findAllByPk($pk, $criteria=null)
    {
        return parent::findAllByPk(MtMongoCriteria::toMongoId($pk), $criteria);
    }

    /**
     * @param $id
     * @param null | array | EMongoCriteria $criteria
     * @return static
     */
    public function findById($id, $criteria = NULL)
    {
        /** @var EMongoDocument $this */
        $criteria = new EMongoCriteria($criteria);
        $criteria->id('==', $id);
        return $this->find($criteria);
    }

    /**
     * @param array $ids
     * @param null | array | EMongoCriteria $criteria
     * @param bool $useCursor
     * @return $this[] | EMongoCursor
     */
    public function findAllByIds(array $ids, $criteria = NULL, $useCursor = TRUE)
    {
        /** @var EMongoDocument $this */
        $criteria = new EMongoCriteria($criteria);
        $criteria->id('in', array_values(array_map('strval', $ids)));

        $_useCursor = $this->getUseCursor();
        $this->setUseCursor($useCursor);
        $result = $this->findAll($criteria);
        $this->setUseCursor($_useCursor);

        return $result;
    }

}