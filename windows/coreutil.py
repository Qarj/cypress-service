#!/usr/bin/env python3
from datetime import datetime
import re, subprocess, sys
from os.path import dirname, abspath

LOG_FILE = ''

def project_root ():
    return dirname(abspath(__file__)) + '\\..'

def cypress_port ():
    return 4567

def set_log_file (name):
    global LOG_FILE
    LOG_FILE = name

def log (msg):
    if not msg:
        return

    now = datetime.now()
    print (now, msg)

    if not LOG_FILE:
        return

    shell (f"echo {now} {msg} >> {project_root()}\\logs\\{LOG_FILE}")

def grep (pattern, string):
    search = re.search(pattern, string)
    if search:
        return search.group(1)
    return ''

def int_grep (pattern, string):
    result = grep (pattern, string)
    try:
        return int (result)
    except ValueError:
        return 0

def shell (cmd):
    out = subprocess.run(cmd, shell=True, capture_output=True)
    return out.returncode, out.stdout.decode('utf-8').rstrip() # rstrip removes trailing carriage return

def pid_listening_on_port (netstatSTDOUT):
    return int_grep (r'LISTENING\s+(\d+)', netstatSTDOUT)

def pid_listening_on_cypress_server_port ():
    nothingRunningOnPort, netstatSTDOUT = shell(f"netstat -ano | findstr :{cypress_port ()}")
    if nothingRunningOnPort:
        return 0
    pid = pid_listening_on_port (netstatSTDOUT)
    if pid:
        log (f"PID locking port {cypress_port ()} is {pid}")
        return pid
    log (f"netstat sees activity on port {cypress_port ()} but it isn't locked")
    return 0

def kill_pid (pid):
    shell (f"taskkill /PID {pid} /F")

def kill_pid_listening_on_cypress_server_port ():
    pid = pid_listening_on_cypress_server_port ()
    kill_pid (pid)

def first_pid_locking_server_log ():
    handle_cmd = f"handle64 {project_root ()}\\logs\\server.log /accepteula"
    notLocked, handleSTDOUT = shell(handle_cmd)
    if notLocked:
        return 0
    pid = int_grep (r'pid: (\d+)', handleSTDOUT)
    log (f"{pid} is locking server.log")
    return pid

def kill_processes_locking_server_log ():
    for _ in range (10):
        pid = first_pid_locking_server_log ()
        if pid == 0:
            break
        kill_pid (pid)

def today ():
    return datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
