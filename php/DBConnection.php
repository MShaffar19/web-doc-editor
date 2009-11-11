<?php

require_once dirname(__FILE__) .'/conf.inc.php';

class DBConnection
{
    private static $instance;

    public static function getInstance()
    {
        if (!isset(self::$instance)) {
            $c = __CLASS__;
            self::$instance = new $c;
        }
        return self::$instance;
    }

    private $conn;

    private function __construct()
    {
        try {
            $this->conn = new mysqli(
                DOC_EDITOR_SQL_HOST,
                DOC_EDITOR_SQL_USER,
                DOC_EDITOR_SQL_PASS,
                DOC_EDITOR_SQL_BASE
            );
            if (mysqli_connect_errno()) {
                throw new Exception('connect databases faild!');
            }
        } catch (Exception $e) {
            echo $e->getMessage();
            exit;
        }
    }

    public function query($s)
    {
        $r = $this->conn->query($s) or die('Error: '.$this->conn->error.'|'.$s);
        return $r;
    }

    public function insert_id()
    {
        return $this->conn->insert_id;
    }

    public function real_escape_string($escape_str)
    {
        return $this->conn->real_escape_string($escape_str);
    }
}

?>