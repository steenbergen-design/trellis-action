const core = require('@actions/core');
const child_process = require('child_process');
const fs = require('fs');
const yaml = require('js-yaml');

const verbose = core.getInput('verbose') == 'true' ? '-vvv' : false;

const site_path = core.getInput('site_path');
const trellis_path = core.getInput('trellis_path');

// TODO:
// Switch to build in core.debug for debugging. 
if(verbose) {
    console.log(`
Verbose: ${core.getInput('verbose')} (${verbose})
Site Path: ${site_path}
Trellis Path: ${trellis_path}
    `);

    Object.keys(process.env).forEach(function(key) {
        let value = process.env[key];
        console.log(key + ': ' + value); 
    });
}

try {
    // Move to trellis dir
    process.chdir(trellis_path);
} catch (error) {
    core.setFailed(`${trellis_path} doesn\'t exist. Make sure to run actions/checkout before this`);
}

// Manually wrap output
core.startGroup('Setup Vault Pass');
try {
    // Vault Pass
    const vault_pass_file = core.getInput('vault_password_file');
    console.log(`Adding vault_pass to ${vault_pass_file}`);
    fs.writeFileSync(vault_pass_file, core.getInput('vault_password'));
} catch (error) {
    core.error('Setting vault pass failed: '+error.message);
}
core.endGroup();

// Galaxy roles
core.startGroup('Install Galaxy Roles')
try {
    const role_file = core.getInput('role_file');
    console.log("Installing Galaxy Roles using "+role_file);
    child_process.spawnSync(`ansible-galaxy install -r ${role_file} ${verbose}`);
} catch (error) {
    core.setFailed('Installing galaxy role failed: '+error.message);
}
core.endGroup();

// Deploy site(s)
// I should clean up this mess
try {
    const site_env = core.getInput('site_env', {required: true});
    let site_name = core.getInput('site_name');
    const group_vars = core.getInput('group_vars') && `group_vars/${site_env}/wordpress_sites.yml`;

    const wordpress_sites = yaml.safeLoad(fs.readFileSync(group_vars, 'utf8'));

    if(site_name) {
        let site = wordpress_sites.wordpress_sites[site_name];
        deploy_site(site_name, site, site_env)
    } else { 
        const site_key = core.getInput('site_key', {required: true});
        const site_value = core.getInput('site_value', {required: true});

        Object.keys(wordpress_sites.wordpress_sites).forEach(function(site_name) {
            let site = wordpress_sites.wordpress_sites[site_name];
            if(site[site_key] == site_value) {
                deploy_site(site_name, site, site_env);
            }
        });
    }
} catch (error) {
    core.setFailed('Deploy site(s) failed: ' + error.message);
}


// Log Yarn Cache Files
if(verbose) {
    core.startGroup('Yarn Cache Files')
    try {
        fs.readdirSync(process.env['YARN_CACHE_FOLDER'] + '/v4').forEach(file => {
            console.log(file);
        });    
    } catch (error) {
        console.log('No yarn cache files found: '+error.message);
    }
    core.endGroup();
}

function deploy_site(site_name, site, site_env){
    // Make sure site folder exists. We're already in the trellis folder so this should work fine.
    const ansible_site_path = site.local_path;
    if (fs.existsSync(site_path) && !fs.existsSync(ansible_site_path) ) {
        // Just symlink the directories together so ansible can find it.
        console.log(`Symlink ${site_path} to ${ansible_site_path}`);
        try {
            fs.symlinkSync(site_path, ansible_site_path);
        } catch (error) {
            core.error(`Symlinkin ${site_path} to ${ansible_site_path} failed: ${error.message}`);
        }
    } 

    core.group(`Deploy Site ${site_name}`, async () => {
        const deploy = await run_playbook(site_name, site_env, process.env['GITHUB_SHA']);
        return deploy;
    });
}

function run_playbook(site_name, site_env, sha) {
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
        core.setFailed('Running playook failed: '+ error.message);
    }
}