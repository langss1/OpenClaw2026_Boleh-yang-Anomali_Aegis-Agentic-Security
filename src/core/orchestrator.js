const ReconAgent = require('../agents/recon_agent');
const SecurityAgent = require('../agents/security_agent');
const PentestAgent = require('../agents/pentest_agent');
const PatchAgent = require('../agents/patch_agent');
const ValidationAgent = require('../agents/validation_agent');

class Orchestrator {
    constructor(targetDir) {
        this.targetDir = targetDir;
    }

    async runFullPipeline() {
        console.log(`\n\x1b[31m[ AEGIS AUTOPILOT INITIALIZED ]\x1b[0m`);
        
        await new ReconAgent(this.targetDir).run();
        const findings = await new SecurityAgent(this.targetDir).run();

        if (findings.length > 0) {
            await new PentestAgent(this.targetDir).run(findings);
            const healed = await new PatchAgent(this.targetDir).run(findings);
            await new ValidationAgent(this.targetDir).run(healed);
        }

        console.log(`\n\x1b[31m[ PIPELINE COMPLETED ]\x1b[0m\n`);
    }
}

module.exports = Orchestrator;
