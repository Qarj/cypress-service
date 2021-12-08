#!/usr/bin/env python3
from coreutil import grep, int_grep, shell, cypress_port, project_root, set_log_file, log
from coreutil import kill_processes_locking_service_log, pid_listening_on_port
from coreutil import first_pid_locking_server_log, today
import os
from time import sleep

def cypress_service_already_running ():
    nothingRunningOnPort, netstatSTDOUT = shell(f"netstat -ano | findstr :{cypress_port ()}")
    if nothingRunningOnPort:
        return False
    pid = pid_listening_on_port (netstatSTDOUT)
    if pid:
        log (f"PID locking port {cypress_port ()} is {pid}")
        return True
    log (f"netstat sees activity on port {cypress_port ()} but it isn't locked")
    return False

def server_log_locked ():
    pid = first_pid_locking_server_log ()
    if not pid:
        log ('Server log file is not locked')
        return False
    log ('Server log file is locked')
    return True

def start_cypress_service ():
    start_service_cmd = f'cd /D {project_root ()} && set "CYPRESS_CACHE_FOLDER=D:\CYPRESS_CACHE_FOLDER" && start cmd.exe /c "npm run start > {project_root ()}\\logs\\cypress-service.log 2>&1"'
    os.system (start_service_cmd) # cannot run with subprocess - python will wait

set_log_file ('cypress-service-start.log')

if cypress_service_already_running ():
    log ('Cypress service is already running - not starting')
    exit (1)
log ('Cypress service is not running - starting now')

if server_log_locked ():
    kill_processes_locking_service_log ()

start_cypress_service ()

for _ in range (5):
    if cypress_service_already_running ():
        log ('Cypress service now started')
        exit (0)
    sleep (3)

log ('Cypress service failed to start')
exit (1)
   
