# Trellis Deploy GitHub Action

This action deploys your bedrock site to your trellis environment.
This action expects trellis in the `$GITHUB_WORKSPACE/trellis` subdirectory. 

## Usage

1. In your repository, go to the *Settings > Secrets* menu and create a new secret called `vault_pass`. Put the vault pass into the contents field.
2. In your workflow definition file, add `xilonz/trellis-action@v0.1.0`. See next example:

```yaml
# .github/workflows/my-workflow.yml
jobs:
    my_job:
    ...
        container:
        image: cytopia/ansible:2.7-tools
        env:
            ANSIBLE_HOST_KEY_CHECKING: false
            ANSIBLE_STRATEGY_PLUGINS: /usr/lib/python3.6/site-packages/ansible_mitogen/plugins/strategy
            ANSIBLE_STRATEGY: mitogen_linear
        steps:
        - uses: webfactory/ssh-agent@v0.1.1
          with:
            ssh-private-key: ${{ secrets.SSH_PRIVATE_KEY }}
        - uses: actions/checkout@v1
        - uses: xilonz/trellis-action@v0.1.0
          with: 
            vault_password: ${{ secrets.vault_pass }}
            site_env: production
            site_name: example.com
```

You can also choose to deploy multiple sites at once by searching for `site_key == site_value`

```yaml
# .github/workflows/my-workflow.yml
jobs:
    my_job:
    ...
        container:
        image: cytopia/ansible:2.7-tools
        env:
            ANSIBLE_HOST_KEY_CHECKING: false
            ANSIBLE_STRATEGY_PLUGINS: /usr/lib/python3.6/site-packages/ansible_mitogen/plugins/strategy
            ANSIBLE_STRATEGY: mitogen_linear
        steps:
        - uses: webfactory/ssh-agent@v0.1.1
          with:
            ssh-private-key: ${{ secrets.SSH_PRIVATE_KEY }}
        - uses: actions/checkout@v1
        - uses: xilonz/trellis-action@v0.1.0
          with: 
            vault_password: ${{ secrets.vault_pass }}
            site_env: production
            site_key: repo
            site_value: git@github.com:${{ github.repository }}
```

## Known issues, limitations and FAQ

### I don't know if this works with sage 9 - yet. 

This action has not been tested with sage 9. Please let me know if this works for you. 

### Trellis isn't in the same repo!

I haven't got a definitive answer for you. `actions/checkout@v1` is able to chekckout other repos, but I haven't got that to work. You could try something like adding the following steps:

```yaml
# .github/workflows/my-workflow.yml
# $GITHUB_WORKSPACE is set by actions/checkout
    ...
    - uses: actions/checkout@v1
    - name: Move site to subdirectory
      run: |
        mv $GITHUB_WORKSPACE /tmp/repo
        mkdir -p $GITHUB_WORKSPACE
        mv /tmp/repo $GITHUB_WORKSPACE/$SITE_LOCAL_PATH
        ls -la $GITHUB_WORKSPACE/$SITE_LOCAL_PATH
    - name: Clone Trellis Repo
      run: git clone --verbose --branch $TRELLIS_BRANCH --depth 1 $TRELLIS_REPO $GITHUB_WORKSPACE/trellis
    ...
```

## Hacking

As a note to my future self, in order to work on this repo:

* Clone it
* Run `yarn install` to fetch dependencies
* _hack hack hack_
* `node index.js` (inputs are passed through `INPUT_` env vars)
* Run `./node_modules/.bin/ncc build index.js` to update `dist/index.js`, which is the file actually run
* Read https://help.github.com/en/articles/creating-a-javascript-action if unsure.
* Maybe update the README example when publishing a new version.

## Credits, Copyright and License
[Trellis Action](https://github.com/Xilonz/trellis-action) is a [Steenbergen Design](https://steenbergen.design) project and maintained by Arjan Steenbergen

Special thanks to [the Roots team](https://roots.io/about/) whose [Trellis](https://github.com/roots/trellis) make this project possible.

Copyright 2019 Steenbergen design. Code released under [the MIT license](LICENSE).