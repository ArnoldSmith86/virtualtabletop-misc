
if [ -z "${vtt_url}" ]; then url="http://localhost:8272" ; else url="${vtt_url}" ; fi
if [ -z "${vtt_room}" ]; then room="testRoom" ; else room="${vtt_room}" ;  fi
if [ -z "${vtt_room_file}" ]; then room_file="${room}.room" ; else room_file="${vtt_room_file}"  ; fi
if [ -z "${vtt_interval}" ]; then interval=15 ; else interval="${vtt_interval}"  ; fi
if [ -z "${vtt_update_wait}" ]; then update_wait=1 ; else update_wait="${vtt_update_wait}"  ; fi

full_url="${url}/state/${room}"
online_snapshot=".tmp_${room}.in.room"
local_snapshot=".tmp_${room}.out.room"
last_online_change=".tmp_${room}.out.timestamp"
last_local_change=".tmp_${room}.in.timestamp"
kill_switch="vtt_kill.now"

echo ""
echo "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~     "
echo "~.''''''''''''''''''''''''''''''''_    "
echo "~:  STARTING READ-WRITE VVT ROOM   /   "
echo "~~: ============================ _/    "
echo "~~~:   + ROOM : ${room} /              "
echo "~~~~:   + TARGET : ${room_file} /      "
echo "~~~~~:   + SERVER: ${url} /            "
echo "~~~~~~''..............................."
echo "~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~"
echo ""


if [ -f "${kill_switch}" ]; then rm "${kill_switch}" ; fi
if [ ! -f "${local_snapshot}" ]; then echo ' ' >  "${local_snapshot}" ; fi
if [ ! -f "${last_online_change}" ]; then echo ' ' > "${last_online_change}" ; fi

# Ensure server is up
if curl -s "${url}" > /dev/null ; then echo "-- SERVER found" ; echo "" ; else echo " [ Can not find server ] " ; exit 1 ; fi

new_interval=0 ;
while sleep ${new_interval} ; do

	if [ -f "${kill_switch}" ]; then echo "[ found kill switch ] ! ... exiting" ; break ; fi
	
	echo "-- Fetching" ;

	# Get online snapshot
	curl -s "${full_url}" > "${online_snapshot}"

	# Download on change
	roomdif="$( cmp "$online_snapshot" "$local_snapshot" )"
        if [ ! -z "${roomdif}" ]; then 
		echo "-- Saving new room data"
		cat "${online_snapshot}" > "${room_file}" ; cat "${online_snapshot}" > "${local_snapshot}" ;
		stat --printf '%y' "${room_file}" > "${last_online_change}"
	fi

	# Update file-time
	stat --printf '%y' "${room_file}" > "${last_local_change}"

	# Upload on change
	stmpdif="$( cmp "$last_online_change" "$last_local_change" )"
        if [ ! -z "${stmpdif}" ]; then 
		echo -n "-- Posting update ... " ; curl -s -X PUT -H 'Content-Type: application/json' -d @"${room_file}" "${full_url}" ; echo " "
		echo "-- Giving instance time for update" ; sleep ${update_wait} ;
		curl -s ${full_url} > ${local_snapshot} ;
		stat --printf '%y' "${room_file}" > "${last_online_change}"
	fi

	if [ -f "${kill_switch}" ]; then echo "[ found kill switch ] ! ... exiting" ; break ; fi
	new_interval=${interval} ;
	echo ".. Back to Waiting"
	echo ""
done

echo "-- Done"

exit 0

