#!/bin/bash

# Backup the environment variables set by the extension
_OLD_JAVA_HOME=$JAVA_HOME
_OLD_MAVEN_HOME=$MAVEN_HOME
_OLD_M2_HOME=$M2_HOME

# Source the user's .bashrc
if [ -f ~/.bashrc ]; then
    . ~/.bashrc
fi

# Restore the extension's environment variables
export JAVA_HOME=$_OLD_JAVA_HOME
export MAVEN_HOME=$_OLD_MAVEN_HOME
export M2_HOME=$_OLD_M2_HOME

# Prepend to PATH
if [ -n "$JAVA_HOME" ]; then
    PATH="$JAVA_HOME/bin:$PATH"
fi

if [ -n "$MAVEN_HOME" ]; then
    PATH="$MAVEN_HOME/bin:$PATH"
fi

export PATH