<?php
/**
 * Created by PhpStorm.
 * User: konstantin
 * Date: 19.03.15
 * Time: 17:15
 */

/**
 * Class MtMongoCriteria
 *
 * @property MtBaseMongoModel $model
 */
class MtMongoCriteria extends EMongoCriteria {

    const AND_OP = '$and';
    const OR_OP = '$or';

    /**
     * @var MtBaseMongoModel
     */
    private $_model;

    /**
     * @param null $criteria
     * @param MtBaseMongoModel $model
     */
    public function __construct($criteria = NULL, MtBaseMongoModel $model = NULL)
    {
        if ($model) $this->setModel($model);

        if ($criteria and is_array($criteria)
            and !array_intersect(['conditions', 'select', 'limit', 'offset', 'sort'], array_keys($criteria))
        ) {
            $criteria = ['conditions' => $criteria];
        }

        return parent::__construct($criteria);
    }

    /**
     * @param string $fieldName
     * @param array $parameters
     * @return $this|mixed
     */
    public function __call($fieldName, $parameters)
    {
        if (count($parameters) == 1
            and !in_array(strtolower($parameters[0]), array_keys(self::$operators))
        ) {
            array_unshift($parameters, '==');
        }
        return parent::__call($fieldName, $parameters);
    }

    final public static function toMongoId($id)
    {
        if ($id and is_string($id) and MongoId::isValid($id)) {

            $id = new MongoId($id);

        } elseif ($id and is_array($id)) {

            $id = array_map([__CLASS__, 'toMongoId'], $id);
        }
        return $id;
    }

    /**
     * @param $condition
     * @param string $op
     * @return $this
     */
    public function addAndCond($condition, $op = self::AND_OP)
    {
        if (!$condition) return $this;

        $conditions = isset($this->getConditions(NULL, FALSE)[$op])
            ? $this->getConditions(NULL, FALSE)[$op]
            : [];

        $conditions = array_merge($conditions, self::_chunk(self::_cond($condition)));

        return $conditions
            ? $this->addCond($op, 'eq', $conditions)
            : $this;
    }

    /**
     * @param $condition
     * @return MtMongoCriteria
     */
    public function addOrCond($condition)
    {
        return $this->addAndCond($condition, self::OR_OP);
    }

    /**
     * @param $conditions
     * @return array
     */
    public static function orCond($conditions)
    {
        return self::_logicCond($conditions, self::OR_OP);
    }

    /**
     * @param $conditions
     * @return array
     */
    public static function andCond($conditions)
    {
        return self::_logicCond($conditions, self::AND_OP);
    }

    public function toOr()
    {
        return $this::orCond($this);
    }

    public function toAnd()
    {
        return $this::andCond($this);
    }

    public function endCond()
    {
        $conditions = $this->getConditions(NULL, FALSE);

        $this->setConditions([]);

        return $conditions;
    }

    public static function emptyCond($name, $not = FALSE, $emptyValues = [NULL, ''])
    {
        if (is_array($name)) {
            $conditions = array_map(function($name) use ($not, $emptyValues) {
                return self::emptyCond($name, $not, $emptyValues);
            }, $name);
            $conditions = array_values($conditions);

            return $not ? self::orCond($conditions) : self::andCond($conditions);
        }

        $c = self::obj()->$name($not ? 'exists' : 'notexists');

        if ($emptyValues) {
            if ($not) {
                $c->$name('notin', $emptyValues);
            } else {
                $c->setConditions(self::orCond([
                    $c->getConditions(NULL, FALSE),
                    self::obj()->$name('in', $emptyValues)->getConditions(NULL, FALSE)
                ]));
            }
        }
        return $c->getConditions(NULL, FALSE);
    }

    /**
     * @param MtBaseMongoModel $model
     * @param bool $useModel
     * @return array
     */
    public function getConditions(MtBaseMongoModel $model = NULL, $useModel = TRUE)
    {
        if ($useModel
            and $model = $model ?: $this->getModel()
        ) {
            $conditions = $model->getConditions($this);
        } else {
            $conditions = parent::getConditions();
        }
        return $conditions;
    }

    /**
     * @param MtBaseMongoModel $model
     * @return $this
     */
    public function setModel(MtBaseMongoModel $model)
    {
        $this->_model = $model;
        return $this;
    }

    /**
     * @return MtBaseMongoModel
     */
    public function getModel()
    {
        return $this->_model;
    }

    /**
     * @param null $criteria
     * @param MtBaseMongoModel $model
     * @return MtMongoCriteria
     */
    public static function obj($criteria = NULL, MtBaseMongoModel $model = NULL)
    {
        return new static($criteria, $model);
    }

    /**
     * @param $conditions
     * @param $operator
     * @return array
     */
    private static function _logicCond($conditions, $operator)
    {
        $conditions = self::_cond($conditions);

        return $conditions
            ? [$operator => self::_chunk($conditions)]
            : [];
    }

    private static function _chunk($conditions)
    {
        return is_array_assoc($conditions)
            ? array_chunk($conditions, 1, TRUE)
            : $conditions;
    }

    private static function _cond($condition, $recursive = TRUE)
    {
        if ($recursive and is_array($condition)) {

            $condition = array_map([__CLASS__, '_cond'], $condition);

        } elseif ($condition instanceof EMongoCriteria) {

            $condition = $condition->getConditions(NULL, FALSE);
        }

        return $condition ;
    }

}