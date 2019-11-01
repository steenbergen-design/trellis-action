const core = require('@actions/core');
const child_process = require('child_process');
const fs = require('fs');

const verbose = core.getInput('verbose') ? '-vvv' : '';

try {
    // Move to trellis dir
    const trellis_path = core.getInput('trellis_path');
    process.chdir(trellis_path ? trellis_path : `${process.env['GITHUB_WORKSPACE']}/trellis/`);
} catch (error) {
    core.setFailed(`${process.env['GITHUB_WORKSPACE']}/trellis/ doesn\'t exist. Make sure to run actions/checkout before this`);
}

// Manually wrap output
core.startGroup('Setup Vault Pass');
try {
    // Vault Pass
    const vault_pass_file = core.getInput('vault_password_file');
    console.log(`Adding vault_pass to ${vault_pass_file}`);
    fs.writeFileSync(vault_pass_file, core.getInput('vault_password'));
} catch (error) {
    core.error(error.message);
}
core.endGroup();

// Galaxy roles
core.startGroup('Install Galaxy Roles')
try {
    const role_file = core.getInput('role_file');
    console.log("Installing Galaxy Roles using "+role_file);
    child_process.spawnSync(`ansible-galaxy install -r ${role_file} ${verbose}`);
} catch (error) {
    core.setFailed(error.message);
}
core.endGroup();

// Deploy site(s)
// I should clean up this mess
try {
    const site_env = core.getInput('site_env', {required: true});
    const site_name = core.getInput('site_name');

    if(site_name) {
        core.group(`Deploy Site`, async () => {
            const deploy = await deploy_site(site_name, site_env, process.env['GITHUB_SHA']);
            return deploy;
        });
    } else { 
        const site_key = core.getInput('site_key', {required: true});
        const site_value = core.getInput('site_value', {required: true});

        const yaml = require('js-yaml');
        const config = yaml.safeLoad(fs.readFileSync(`group_vars/${site_env}/wordpress_sites.yml`, 'utf8'));

        Object.keys(config.wordpress_sites).forEach(function(site_name) {
            var site = config.wordpress_sites[site_name];
            if(site[site_key] == site_value) {
                core.group(`Deploy Site ${site_name}`, async () => {
                    const deploy = await deploy_site(site_name, site_env, process.env['GITHUB_SHA']);
                    return deploy;
                });
            }
        });

    }
} catch (error) {
    core.setFailed(error.message);
}

function deploy_site(site_name, site_env, sha) {
    try {
        const child = child_process.spawnSync('ansible-playbook', ['deploy.yml',`-e site=${site_name}`, `-e env=${site_env}`, `-e site_version=${sha} ${verbose}`]);

        if( child.stdout ) 
            console.log(`${child.stdout}`);

        if( child.stderr ) 
            console.log(`${child.stderr}`);

        if( child.status != 0)
            if(child.error) core.setFailed(child.error.message);
            else core.setFailed(`${child.stderr}`);
    } catch (error) {
        core.setFailed(error.message);
    }
}