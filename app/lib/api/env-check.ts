// Check for required environment variables
export function checkEnvironmentVariables() {
  const requiredVars = ['ANTHROPIC_API_KEY', 'OXYLABS_USERNAME', 'OXYLABS_PASSWORD'];
  const missingVars: string[] = [];
  
  // Log environment variables status
  console.log('Environment variables check:');
  
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (!value) {
      missingVars.push(varName);
      console.error(`Missing required environment variable: ${varName}`);
    } else {
      // Only show the first few characters of the key for security
      const maskedValue = varName.includes('PASSWORD') ? 
        '******' : 
        `${value.substring(0, 5)}...`;
      console.log(`✓ ${varName} is set (${maskedValue})`);
    }
  });
  
  if (missingVars.length > 0) {
    console.warn(`WARNING: Some required environment variables are missing: ${missingVars.join(', ')}`);
    console.warn('The application will use mock data for demonstration purposes.');
    console.warn('To enable full functionality, please set these variables in your .env.local file or Vercel environment variables.');
  } else {
    console.log('✓ All required environment variables are set.');
  }
  
  return {
    missingVars,
    allVarsPresent: missingVars.length === 0
  };
} 