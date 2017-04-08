#!/bin/sh
if [ "$QUERY_STRING" != "video" ] && [ "$QUERY_STRING" != "music" ] && [ "$QUERY_STRING" != "picture" ] && [ "$QUERY_STRING" != "document" ] ;then
	echo ""
	exit 1
fi
res=`ls /var/www/HDD/$QUERY_STRING 2> /dev/null`
echo $res


