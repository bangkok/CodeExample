<?php
/**
 * Created by PhpStorm.
 * User: konstantin
 * Date: 20.11.14
 * Time: 17:31
 */

class MtModelStatusBehavior extends EMongoDocumentBehavior {

    public $attribute;

    public function init()
    {
        if (!$this->attribute) {
            if (method_exists($this->getOwner(), 'getStatusAttributeName')) {

                $this->attribute = $this->getOwner()->getStatusAttributeName();
            } else {
                throw new Exception('Class '. get_class($this->getOwner()) .' status attribute not determined.');
            }
        }
    }

    public function getStatusAttributeName()
    {
        return $this->attribute;
    }

    /**
     * @return MtStatusField
     */
    public function getStatusField()
    {
        return $this->getOwner()->getField($this->attribute);
    }

    /**
     * @param null $value
     * @return mixed
     */
    public function isActive($value = NULL)
    {
        return $this->getStatusField()->isActive($value);
    }

    /**
     * @return mixed
     */
    public function getStatus()
    {
        return $this->getStatusField()->getValue();
    }

    /**
     * @return mixed
     */
    public function getStatusList()
    {
        return $this->getStatusField()->getList();
    }

    /**
     * @param null $criteria
     * @return EMongoCriteria
     */
    public function getStatusActiveCriteria($criteria = NULL)
    {
        return $this->getStatusField()->getActiveCriteria($criteria);
    }

} 