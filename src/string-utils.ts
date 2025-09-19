export const capitalizeFirst = (str: string): string =>
  str.charAt(0).toUpperCase() + str.slice(1)

export const toPascalCase = (str: string): string => {
  const cleaned = str.replace(/\s+API$/i, "").replace(/API\s*/gi, "")
  return cleaned.split(/[-_\s]+/).map(capitalizeFirst).join("") + "Api"
}

export const toCamelCase = (str: string): string => {
  const cleaned = str.replace(/\s+API$/i, "").replace(/API\s*/gi, "")
  const pascal = cleaned.split(/[-_\s]+/).map(capitalizeFirst).join("")
  return pascal.charAt(0).toLowerCase() + pascal.slice(1)
}