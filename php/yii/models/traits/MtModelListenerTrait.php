<?php
/**
 * Created by PhpStorm.
 * User: konstantin
 * Date: 13.01.15
 * Time: 10:42
 */

/**
 * Proxy events to singleton model
 */
trait MtModelListenerTrait {

    /**
     * @param string $name
     * @param CEvent $event
     */
    public function raiseEvent($name, $event)
    {
        parent::raiseEvent($name, $event);

        if (!$this->_isSingleton()) {

            static::model()->raiseEvent($name, $event);

            if (!empty($event->params['errors'])) {
                $this->addErrors($event->params['errors']);
            }
        }
    }

    /**
     * @param $name
     * @return bool
     */
    public function hasEventHandler($name)
    {
        return parent::hasEventHandler($name)
            or !$this->_isSingleton()
            and static::model()->hasEventHandler($name);
    }

    /**
     * @return bool
     */
    private function _isSingleton()
    {
        return $this === static::model();
    }
} 