#!/usr/bin/env python3
from coreutil import grep, int_grep, shell, cypress_port, project_root, set_log_file, log
from coreutil import kill_pid_listening_on_cypress_server_port
from coreutil import kill_processes_locking_server_log
import os

set_log_file ('cypress_stop.log')

log ('Stopping Cypress')

kill_pid_listening_on_cypress_server_port ()
kill_processes_locking_server_log ()

log ('Cypress stopped')
