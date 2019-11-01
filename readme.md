# Trellis Deploy GitHub Action

This action deploys your bedrock site to your trellis environment.
This action expects trellis in the `$GITHUB_WORKSPACE/trellis` subdirectory. 

## Requirements
- [Trellis](https://github.com/roots/trellis) 
- [Github Actions](https://github.com/features/actions)
- (Optional) Bedrock
- (Optional, Not Tested!) Sage [9.0.1](https://github.com/roots/sage/releases/tag/9.0.1) or later
- A Docker image with ansible preinstaled. `cytopia/ansible:2.7-tools` or `cytopia/ansible:2.7` recommended

## File Structures

[Trellis Deploy](https://github.com/Xilonz/trellis-action) comes with 2 different `main.yml` examples. They are expecting different Trellis and Bedrock structures.

### Official

Use [`main.yml`](./main.yml) if your directory structure follow [the official documents](https://roots.io/trellis/docs/installing-trellis/#create-a-project):
```
example.com/      # → Root folder for the project
├── .git/         # → Only one git repo
├── trellis/      # → Your clone of roots/trellis, directory name must be `trellis`
└── site/         # → A Bedrock-based WordPress site, directory name doesn't matter
```

To install `main.yml`:
1. Set up SSH keys, Ansible Vault password and commit Trellis changes described in the following sections
1. In your repository, go to the *Settings > Secrets* menu and create a new secret called `vault_pass`. Put the vault pass into the contents field.
1. In your workflow definition file, add `xilonz/trellis-action@v0.1.1`. See next example:

```yaml
# .github/workflows/main.yml
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
        - uses: xilonz/trellis-action@v0.1.1
          with: 
            vault_password: ${{ secrets.vault_pass }}
            site_env: production
            site_name: example.com
```

### Seperated repo's

Some use a opinionated project structure:
- separate Trellis and Bedrock as 2 different git repo
- name the Bedrock-based WordPress site directory more creatively, i.e: `bedrock`

```
example.com/      # → Root folder for the project
├── bedrock/      # → A Bedrock-based WordPress site, directory name doesn't matter
│   └── .git/     # Bedrock git repo
└── trellis/      # → Clone of roots/trellis, directory name must be `trellis`
    └── .git/     # Trellis git repo
```

See: [roots/trellis#883 (comment)](https://github.com/roots/trellis/issues/883#issuecomment-329052189)

1. Set up SSH keys, Ansible Vault password and commit Trellis changes described in the following sections
1. In your repository, go to the *Settings > Secrets* menu and create a new secret called `vault_pass`. Put the vault pass into the contents field.
1. In your workflow definition file, add `xilonz/trellis-action@v0.1.1`. See next example:


```yaml
# .github/workflows/main.yml
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
        - uses: actions/checkout@v1
        - name: Move site to subdirectory
            run: |
                mv $GITHUB_WORKSPACE /tmp/repo
                mkdir -p $GITHUB_WORKSPACE
                mv /tmp/repo $GITHUB_WORKSPACE/$SITE_LOCAL_PATH
                ls -la $GITHUB_WORKSPACE/$SITE_LOCAL_PATH
        - name: Clone Trellis Repo
            run: git clone --verbose --branch $TRELLIS_BRANCH --depth 1 $TRELLIS_REPO $GITHUB_WORKSPACE/trellis
        - uses: xilonz/trellis-action@v0.1.1
          with: 
            vault_password: ${{ secrets.vault_pass }}
            site_env: production
            site_name: example.com
```

## SSH Key 
This is only aplicable if using one of the example codes above. This action has no option to set a SSH key. 

In order to create a new SSH key, run `ssh-keygen -t rsa -b 4096 -m pem -f path/to/keyfile`. This will prompt you for a key passphrase and save the key in `path/to/keyfile`.

Having a passphrase is a good thing, since it will keep the key encrypted on your disk. When configuring the secret `SSH_PRIVATE_KEY` value in your repository, however, you will need the private key *unencrypted*. 

To show the private key unencrypted, run `openssl rsa -in path/to/key -outform pem`.

### Authorizing a key

To actually grant the SSH key access, you can – on GitHub – use at least two ways:

* [Deploy keys](https://developer.github.com/v3/guides/managing-deploy-keys/#deploy-keys) can be added to individual GitHub repositories. They can give read and/or write access to the particular repository. When pulling a lot of dependencies, however, you'll end up adding the key in many places. Rotating the key probably becomes difficult.

* A [machine user](https://developer.github.com/v3/guides/managing-deploy-keys/#machine-users) can be used for more fine-grained permissions management and have access to multiple repositories with just one instance of the key being registered. It will, however, count against your number of users on paid GitHub plans.

### Trellis

1. Add the SSH key to web server
    ```diff
        # group_vars/<env>/users.yml
        users:
        - name: "{{ web_user }}"
            groups:
            - "{{ web_group }}"
            keys:
            - https://github.com/human.keys
    +       - https://github.com/mybot.keys
        - name: "{{ admin_user }}"
            groups:
            - sudo
            keys:
            - https://github.com/human.keys
    ```
1. Re-provision
    `$ ansible-playbook server.yml -e env=<env> --tags users`

## Ensure Trellis Deploys the Correct Commit

Normally, Trellis always deploy the **latest** commit of the branch. We need a change in `group_vars/<env>/wordpress_sites.yml`:

```diff
 # group_vars/<env>/wordpress_sites.yml
 wordpress_sites:
   example.com:
-    branch: master
+    branch: "{{ site_version | default('master') }}"
```

## Ansible Vault Password

Unlike other environment variables, [Ansible Vault](https://docs.ansible.com/ansible/playbooks_vault.html) password should never be stored as plaintext. Therefore, you should add `vault_pass` via your project settings instead of commit it to `.github/workflow/main.yml`.

The examples assume you have defined `vault_password_file = .vault_pass` in `ansible.cfg` as [the official document](https://roots.io/trellis/docs/vault/#2-inform-ansible-of-vault-password) suggested.

```diff
 # ansible.cfg
 [defaults]
+vault_password_file = .vault_pass
```

To use another vault password filename:
```diff
        - uses: xilonz/trellis-action@v0.1.1
          with: 
            vault_password: ${{ secrets.vault_pass }}
+           vault_password_file: myvaultfile.txt
            site_env: production
            site_name: example.com
```

Using [Ansible Vault](https://docs.ansible.com/ansible/playbooks_vault.html) to encrypt sensitive data is strongly recommended. In case you have a very strong reason not to use Ansible Vault, remove the var:

```diff
        - uses: xilonz/trellis-action@v0.1.1
          with: 
-           vault_password: ${{ secrets.vault_pass }}
            site_env: production
            site_name: example.com
```

## Mutliple sites at once
You can also choose to deploy multiple sites at once by searching for `site_key == site_value`.
If someone has a more elegant solution. Please PR!

```diff
        - uses: xilonz/trellis-action@v0.1.1
          with: 
            vault_password: ${{ secrets.vault_pass }}
            site_env: production
-           site_name: example.com
+           site_key: repo
+           site_value: git@github.com:${{ github.repository }}
```

## Known issues, limitations and FAQ

### I don't know if this works with sage 9 - yet. 

This action has not been tested with sage 9. Please let me know if this works for you. 

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

Special thanks to [the Roots team](https://roots.io/about/) whose [Trellis](https://github.com/roots/trellis) make this project possible. Also special thanks to [TypistTech](https://github.com/TypistTech) where I got a lot if inspiration and got [parts](https://github.com/TypistTech/tiller-circleci) of this documentation from.

Copyright 2019 Steenbergen Design. Code released under [the MIT license](LICENSE).