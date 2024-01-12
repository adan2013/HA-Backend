export const checkEnvironmentVariables = (names: string[]) => {
  const missingVariables: string[] = []
  names.forEach((name) => {
    if (!process.env[name]) {
      missingVariables.push(name)
    }
  })
  if (missingVariables.length) {
    console.error(
      `Missing environment variables! Names: ${missingVariables.join(', ')}`,
    )
    process.exit(1)
  }
}
