<?php
/**
 * Created by PhpStorm.
 * User: konstantin
 * Date: 26.03.15
 * Time: 11:15
 */

trait MtModelOldAttributesTrait {

    private $_oldAttributes;

    /**
     * @param null|array|string $names
     * @return array|null|mixed
     */
    public function getOldAttributes($names = NULL)
    {
        if (is_array($names)) {

            return array_diff_key($this->_oldAttributes, array_flip($names));

        } elseif (is_string($names)) {

            return isset($this->_oldAttributes[$names]) ? $this->_oldAttributes[$names] : NULL;

        } else {

            return $this->_oldAttributes;
        }
    }

    /**
     * @param null|array|string $names
     * @return bool
     */
    public function isChanged($names = NULL)
    {
        if (is_string($names)) {

            return $this->$names != $this->getOldAttributes($names);

        } else {

            return $this->getOldAttributes($names) != $this->getAttributes($names);
        }
    }

    protected function afterFind()
    {
        $this->_oldAttributes = $this->getAttributes();

        parent::afterFind();
    }
    protected function afterSave()
    {
        $this->_oldAttributes = $this->getAttributes();

        parent::afterSave();
    }

}