# Usage: source ./aliases.sh

# install
alias i="cd app && bun install && cd - || cd -"

# run
alias r="cd app && bun run dev && cd - || cd -"


#############################################
# Python
#############################################
alias pyenv="python3 -m venv env && source env/bin/activate && pip3 install -r requirements.txt"
# Run Flask application
alias runflask="cd api && export FLASK_APP=index.py && export FLASK_ENV=development && flask run -p 8000 || cd -"


# Misc
alias p="portkill 3000 8000 > /dev/null || true"


portkill() {
  for var in "$@"
  do
    echo "Portkill: $var"
    kill -9 $(lsof -i tcp:$var | tail -n +2 | awk '{ print $2 }') > /dev/null &
  done
}
