export const checkEnvironmentVariables = (names: string[]) => {
  const missingVariables: string[] = []
  names.forEach((name) => {
    if (!process.env[name]) {
      missingVariables.push(name)
    }
  })
  if (missingVariables.length) {
    throw new Error(
      `Missing environment variables: ${missingVariables.join(', ')}`,
    )
  }
}
