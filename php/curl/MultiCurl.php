<?php

/**
 * Class MultiCurl
 */
class MultiCurl {

    /**
     * @param $mh
     * @param array $results
     * @param array $options
     * @return int
     */
    public static function makeRequests($mh, array &$results, array $options = array()) {

        // While we're still active, execute curl
        $active = NULL;

        do {
            // Continue to exec until curl is ready to
            // give us more data
            do {
                $mrc = curl_multi_exec($mh, $active);
            } while ($mrc == CURLM_CALL_MULTI_PERFORM);

            // Wait for activity on any curl-connection
            curl_multi_select($mh);

            //do something with the return values
            while(($info = curl_multi_info_read($mh)) !== FALSE) {

                if ($info["result"] == CURLE_OK) {

                    $info['content'] = curl_multi_getcontent($info["handle"]);
                } else {
                    $info['error'] = curl_error($info["handle"]);
                }
                $results[strval($info["handle"])] = $info;

                curl_multi_remove_handle($mh, $info["handle"]);
            }

        } while ($active && $mrc == CURLM_OK);

        curl_multi_close($mh);

        return $mrc;
    }

    /**
     * @param array $handlers
     * @param array $options
     * @return array
     */
    public static function getRequestsResults(array $handlers, array $options = array())
    {
        $results = array();
        $mh = curl_multi_init();

        foreach ($handlers as $ch) {
            curl_multi_add_handle($mh, $ch);
        }

        self::makeRequests($mh, $results, $options);

        foreach ($handlers as $key => $ch) {

            $handlers[$key] = isset($results[strval($ch)]) ? $results[strval($ch)] : NULL;
        }

        return $handlers;
    }

    /**
     * @param array $handlers
     * @param array $errors
     * @return array
     */
    public static function getRequestsContents(array $handlers, &$errors = array())
    {
        $contents = array();

        foreach (self::getRequestsResults($handlers) as $key => $result) {

            $contents[$key] = isset($result['content']) ? $result['content'] : NULL;

            $errors[$key] = isset($result['error']) ? $result['error'] : NULL;
        }

        return $contents;
    }

}