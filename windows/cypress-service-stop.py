#!/usr/bin/env python3
from coreutil import grep, int_grep, shell, cypress_port, project_root, set_log_file, log
from coreutil import kill_pid_listening_on_cypress_service_port
from coreutil import kill_processes_locking_service_log
import os

set_log_file ('cypress-service-stop.log')

log ('Stopping Cypress')

kill_pid_listening_on_cypress_service_port ()
kill_processes_locking_service_log ()

log ('Cypress stopped')
