<?php
/**
 * Created by PhpStorm.
 * User: vladimir
 * Date: 02.12.14
 * Time: 17:50
 */

class MtListener extends CComponent
{
    public $events;

    public function init()
    {
        $this->attachEvents();
    }

    public function attachEvents()
    {
        foreach ($this->events as $event) {

            $this->attachEvent($event);
        }
    }

    public function attachEvent($event)
    {
        $event[0]::model()->attachEventHandler($event[1], $event[2]);
    }

    public function dettachEvents()
    {
        foreach ($this->events as $event) {

            $this->dettachEvent($event);
        }
    }

    public function dettachEvent($event)
    {
        $event[0]::model()->dettachEventHandler($event[1], $event[2]);
    }
} 