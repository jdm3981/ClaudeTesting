// Azure Functions entry point — import all function registrations here.
// Add a new require() for each function file added in future phases.

require('./functions/health');
require('./functions/recipes');
require('./functions/recipe');

require('./functions/plan');

// Phase 5+
// require('./functions/shopping-list');
