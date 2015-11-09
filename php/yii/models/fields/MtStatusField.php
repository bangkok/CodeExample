<?php
/**
 * Created by PhpStorm.
 * User: konstantin
 * Date: 20.11.14
 * Time: 10:23
 */

class MtStatusField extends MtBaseField {

    // value => DB value, isActive => bool
    public static $BOOLEAN_SCHEMA = [
        ['name'=>'Active', 'value'=>TRUE, 'isActive'=>TRUE, 'map'=>['ACTIVE', 'ACTIVATE', 'TRUE', 'ON', '1']],
        ['name'=>'Pause', 'value'=>FALSE, 'isActive'=>FALSE, 'map'=>['PAUSE', 'PAUSED', 'INACTIVE', 'FALSE', 'OFF', '0']]
    ];

    public static $NUMERIC_SCHEMA = [
        ['name' => 'Active', 'value'=>1, 'isActive' => TRUE, 'map' => ['ACTIVE', 'ACTIVATE', 'TRUE', 'ON', '1']],
        ['name' => 'Pause', 'value'=>0, 'isActive' => FALSE, 'map' => ['PAUSE', 'PAUSED', 'INACTIVE', 'FALSE', 'OFF', '0']]
    ];

    public static $STRING_SCHEMA = [
        ['name' => 'Active', 'value'=>'ACTIVE', 'isActive' => TRUE, 'map' => ['ACTIVE', 'ACTIVATE', 'TRUE', 'ON', '1']],
        ['name' => 'Pause', 'value'=>'PAUSED', 'isActive' => FALSE, 'map' => ['PAUSE', 'PAUSED', 'INACTIVE', 'FALSE', 'OFF', '0']]
    ];

    protected $_schema = [];

    public function init()
    {
        $this->_schema = !empty($this->_params['schema'])
            ? $this->_params['schema']
            : (!empty($this->_params[0]) ? $this->_params[0] : self::$BOOLEAN_SCHEMA);

        if (!empty($this->_params['behavior'])
            and !$this->model->asa('MtModelStatusBehavior')
        ) {
            $this->model->attachBehavior('MtModelStatusBehavior',
                ['class'=>'application.models.MtModelStatusBehavior', 'attribute'=>$this->getAttributeName()]
            );
        }
    }

    /**
     * @return array
     */
    public function getList()
    {
        return array_combine(array_column($this->_schema, 'value'), array_column($this->_schema, 'name'));
    }

    /**
     * @param null $value
     * @return mixed
     */
    public function isActive($value = NULL)
    {
        $value = is_null($value) ? $this->getValue() : $value;

        $key = $this->_map($value);

        return !is_null($key)
            ? $this->_schema[$key]['isActive']
            : null;
    }

    /**
     * @param $value
     * @return mixed|string
     */
    public function getValueForSave($value)
    {
        return is_null($value)
            ? $value
            : $this->_schema[$this->_map($value)]['value'];
    }

    /**
     * @param null $criteria
     * @return EMongoCriteria
     */
    public function getActiveCriteria($criteria = NULL)
    {
        $criteria = $criteria ?: new EMongoCriteria();

        $actives = array_filter(array_column($this->_schema, 'isActive'));

        $schema = $this->_schema;

        $getValues = function () use ($actives, $schema) {
            $result = [];
            foreach ($actives as $key => $item) {
                $result[] = $schema[$key]['value'];
            }
            return $result;
        };

        if (count($actives) > 1) {
            $op = 'in';
            $values = $getValues();
        } else {
            $op = '==';
            $values = $getValues()[0];
        }

        $criteria->{$this->getAttributeName()}($op, $values);

        return $criteria;
    }


    private function _map($value)
    {
        $key = NULL;
        if (is_numeric($value)) {
            $value = strval($value);
        }
        if (is_string($value)) {
            foreach($this->_schema as $i => $item) {
                if (array_search(strtoupper($value), $item['map']) !== FALSE) {
                    $key = $i;
                    break;
                }
            }
        } elseif (!is_null($value)) {
            foreach($this->_schema as $i => $item) {
                if ($value == $item['isActive']) {
                    $key = $i;
                    break;
                }
            }
        }
        return $key;
    }
} 