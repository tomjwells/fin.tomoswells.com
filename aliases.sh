# Usage: source ./aliases.sh
HOMEDIR=$(pwd)

# install
alias i="cd $HOMEDIR/app && bun install && cd $HOMEDIR || cd $HOMEDIR"

# run
alias r="cd $HOMEDIR/app && bun run dev && cd $HOMEDIR || cd $HOMEDIR"


#############################################
# Python
#############################################
alias pyenv="cd $HOMEDIR python3 -m venv env && source env/bin/activate && pip3 install -r requirements.txt"
# Run Flask application
alias runflask="cd $HOMEDIR/api && export FLASK_APP=index.py && export FLASK_ENV=development && flask run -p 8000 || cd $HOMEDIR"


# Misc
alias p="portkill 3000 8000 > /dev/null || true"


portkill() {
  for var in "$@"
  do
    echo "Portkill: $var"
    kill -9 $(lsof -i tcp:$var | tail -n +2 | awk '{ print $2 }') > /dev/null &
  done
}
