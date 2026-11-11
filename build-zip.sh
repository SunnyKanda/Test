#!/bin/sh
# Builds crew-site.zip: everything to upload to the web host, in one file.
set -e
cd "$(dirname "$0")/crew-site"
composer install --no-dev --optimize-autoloader --no-interaction --quiet
printf 'Require all denied\n' > vendor/.htaccess
cd ..
rm -f crew-site.zip
# Leave out the libraries' own git history, tests and examples: the site doesn't need them.
zip -r -q -9 crew-site.zip crew-site \
  -x 'crew-site/data/*' 'crew-site/lib/datapath.php' 'crew-site/composer.*' \
     '*/.git/*' '*/.github/*' 'crew-site/vendor/*/*/tests/*' 'crew-site/vendor/*/*/examples/*' \
     'crew-site/vendor/*/*/fixtures/*' 'crew-site/vendor/*/*/scripts/*' 'crew-site/vendor/*/*/docs/*'
ls -lh crew-site.zip
