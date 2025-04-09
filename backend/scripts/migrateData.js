const mongoose = require("mongoose");
const xlsx = require("xlsx");
const path = require("path");
const dotenv = require("dotenv");

// Load environment variables (especially MONGODB_URI)
dotenv.config({ path: path.resolve(__dirname, "../.env") });

// Import Mongoose models
const Ingredient = require("../src/models/Ingredient");
const Recipe = require("../src/models/Recipe");
const connectDB = require("../src/config/db"); // Import DB connection function
const { logger } = require("../src/utils/logger"); // Import logger

// --- Configuration ---
// Use the correct filename found in the root directory
const EXCEL_FILE_PATH = path.resolve(
  __dirname,
  "../../Pie costing 2023.02.xlsx"
);
const INGREDIENTS_SHEET = "Pie Ingredients";
const LABOR_SHEET = "ManHours Pies";
const RECIPES_SHEET = "Pies";

// Mapping from Afrikaans names in 'ManHours Pies' to English names used in 'Pies'
const pieNameMapping = {
  "Kaas Grillers": "Cheese griller", // Note: Excel sheet 'Pies' uses lowercase 'g'
  "Spinasie en Feta": "Spinach and Feta Pies",
  "Beefstuk en Niertjies": "Steak and Kidney Pies",
  Cornish: "Cornish Pies",
  "Hoender en Mayo": "Chicken Mayonnaise",
  "Kerrie Lam": "Lamb Curry Pies",
  "Pepper Steak": "Pepper Steak Pies",
  "Wild Pastei": "Venison Pies",
  // Add other mappings if necessary
  Snoepies: "Basic Mince Pies", // UPDATED: Changed key from "Basiese Maalvleis Pasteie"
};

// --- Ingredient Name Mapping --- >>
// Map names found in 'Pies' sheet (lowercase) to names in 'Pie Ingredients' sheet (lowercase)
const ingredientNameVariations = {
  "garlic flakes": "garlic",
  deeg: "master puff", // Assuming 'Deeg' in recipes corresponds to 'Master Puff' in ingredients
  // Add more variations here if needed
};
// << --- End Ingredient Map ---

// --- Helper Functions ---

// Function to safely parse numbers from Excel cells
function parseNumber(value) {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const parsed = parseFloat(value.replace(/[^\d.-]/g, "")); // Remove currency symbols, commas etc.
    return isNaN(parsed) ? 0 : parsed; // Return 0 if parsing fails
  }
  return 0; // Default to 0 if not number or string
}

// Function to get cell value safely
function getCellValue(sheet, row, col) {
  const cellAddress = xlsx.utils.encode_cell({ r: row, c: col });
  const cell = sheet[cellAddress];
  return cell ? cell.v : undefined; // .v contains the raw value
}

// --- Main Migration Logic ---

const migrateData = async () => {
  logger.info("Starting data migration...");
  let migrationError = null; // Flag to track errors

  try {
    // 1. Connect to Database
    await connectDB();
    logger.info("Database connected successfully.");

    // 2. Read Excel File
    if (!require("fs").existsSync(EXCEL_FILE_PATH)) {
      throw new Error(`Excel file not found at ${EXCEL_FILE_PATH}`);
    }
    const workbook = xlsx.readFile(EXCEL_FILE_PATH);
    logger.info(`Excel file "${path.basename(EXCEL_FILE_PATH)}" loaded.`);

    // --- Step A: Process Ingredients ---
    logger.info(`Processing sheet: "${INGREDIENTS_SHEET}"...`);
    const ingredientsSheet = workbook.Sheets[INGREDIENTS_SHEET];
    if (!ingredientsSheet)
      throw new Error(`Sheet "${INGREDIENTS_SHEET}" not found.`);
    const ingredientsData = xlsx.utils.sheet_to_json(ingredientsSheet, {
      header: 1,
      range: 1,
    }); // Skip header row

    const ingredientMap = new Map(); // Map name to ObjectId for quick lookup

    for (const row of ingredientsData) {
      const name = row[0]?.trim();
      let costPerUnit = parseNumber(row[2]); // P/KG
      let unit = "kg";
      if (!costPerUnit && row[3]) {
        costPerUnit = parseNumber(row[3]); // P/L
        unit = "L";
      }

      if (name && costPerUnit > 0) {
        try {
          const ingredientDoc = await Ingredient.findOneAndUpdate(
            { name: name },
            { name: name, costPerUnit: costPerUnit, unit: unit },
            { upsert: true, new: true, runValidators: true }
          );
          const lowerCaseName = name.toLowerCase();
          ingredientMap.set(lowerCaseName, ingredientDoc._id);
          logger.debug(
            `Added to ingredientMap: KEY="${lowerCaseName}", NAME="${name}", ID=${ingredientDoc._id}`
          );
        } catch (error) {
          logger.error(
            `Failed to upsert ingredient "${name}": ${error.message}`
          );
        }
      } else if (name) {
        logger.warn(
          `Skipping ingredient "${name}" due to missing or invalid cost data.`
        );
      }
    }
    logger.info(`Processed ${ingredientMap.size} unique ingredients.`);

    // --- Step B: Process Labor Costs ---
    logger.info(`Processing sheet: "${LABOR_SHEET}"...`);
    const laborSheet = workbook.Sheets[LABOR_SHEET];
    if (!laborSheet) throw new Error(`Sheet "${LABOR_SHEET}" not found.`);
    const laborData = xlsx.utils.sheet_to_json(laborSheet, {
      header: 1,
      range: 1,
    }); // Skip header row

    const laborRateMap = new Map(); // Map English Pie Name to Hourly Rate

    for (const row of laborData) {
      const afrikaansName = row[0]?.trim();
      const rawCostValue = row[4]; // Get raw value from Cost column

      const hourlyRate = parseNumber(rawCostValue);

      if (afrikaansName && hourlyRate > 0) {
        const englishName = pieNameMapping[afrikaansName] || afrikaansName;
        laborRateMap.set(englishName, hourlyRate);
      } else if (afrikaansName) {
        logger.warn(
          `Skipping labor rate for "${afrikaansName}" due to missing or invalid cost data.`
        );
      }
    }
    logger.info(`Processed labor rates for ${laborRateMap.size} pie types.`);
    // --- DEBUG: Log all labor rate keys ---
    logger.debug(
      "Labor Rate Map Keys: " + Array.from(laborRateMap.keys()).join(", ")
    );
    // --- END DEBUG ---

    // --- Step C: Process Recipes (Pies Sheet) ---
    logger.info(`Processing sheet: "${RECIPES_SHEET}"...`);
    const recipesSheet = workbook.Sheets[RECIPES_SHEET];
    if (!recipesSheet) throw new Error(`Sheet "${RECIPES_SHEET}" not found.`);

    const sheetRange = xlsx.utils.decode_range(recipesSheet["!ref"]);
    const maxCols = sheetRange.e.c;
    let currentPieData = null;
    let recipesProcessed = 0;

    // Find the row index for key headers/sections
    let headerRowIndex = -1;
    let ingredientStartIndex = -1;
    let laborHeaderIndex = -1;
    let finalCalcHeaderRowIndex = -1;
    let finalCalcValueRowIndex = -1;
    let miniCalcHeaderRowIndex = -1;
    let miniCalcValueRowIndex = -1;

    for (let R = sheetRange.s.r; R <= sheetRange.e.r; ++R) {
      const cellValueA = getCellValue(recipesSheet, R, 0)
        ?.toString()
        .trim()
        .toLowerCase();

      if (cellValueA === "ingredients" && headerRowIndex === -1) {
        headerRowIndex = R;
        ingredientStartIndex = R + 1;
        logger.debug(
          `Found 'Ingredients' header at row ${R + 1}, data starts at ${
            ingredientStartIndex + 1
          }`
        );
        continue;
      }
      if (cellValueA === "no. workers" && laborHeaderIndex === -1) {
        laborHeaderIndex = R;
        logger.debug(`Found 'No. Workers' header at row ${R + 1}`);
        continue;
      }
      if (
        cellValueA &&
        cellValueA.includes("final calculations") &&
        !cellValueA.includes("mini") &&
        finalCalcHeaderRowIndex === -1
      ) {
        const nextRowA = getCellValue(recipesSheet, R + 1, 0)
          ?.toString()
          .trim()
          .toLowerCase();
        if (nextRowA === "qty") {
          finalCalcHeaderRowIndex = R + 1;
          finalCalcValueRowIndex = R + 2;
          logger.debug(
            `Found Standard Final Calc Title at row ${R + 1}, Header at ${
              finalCalcHeaderRowIndex + 1
            }, Values at ${finalCalcValueRowIndex + 1}`
          );
          continue;
        }
      }
      if (
        cellValueA &&
        cellValueA.includes("final calculations mini") &&
        miniCalcHeaderRowIndex === -1
      ) {
        const nextRowA_Mini = getCellValue(recipesSheet, R + 1, 0)
          ?.toString()
          .trim()
          .toLowerCase();
        if (
          nextRowA_Mini &&
          (nextRowA_Mini === "qty" || nextRowA_Mini === "qyt")
        ) {
          miniCalcHeaderRowIndex = R + 1;
          miniCalcValueRowIndex = R + 2;
          logger.debug(
            `Found Mini Final Calc Title at row ${R + 1}, Header at ${
              miniCalcHeaderRowIndex + 1
            }, Values at ${miniCalcValueRowIndex + 1}`
          );
          // Note: We don't 'continue' here as we need the indices for later logic that processes pies
        }
      }
    }
    logger.info(
      `Section Row Indices Found: Ingredients=${headerRowIndex + 1}, Labor=${
        laborHeaderIndex + 1
      }, StdCalcHeader=${finalCalcHeaderRowIndex + 1}, StdCalcValue=${
        finalCalcValueRowIndex + 1
      }, MiniCalcHeader=${miniCalcHeaderRowIndex + 1}, MiniCalcValue=${
        miniCalcValueRowIndex + 1
      }`
    );

    // Check if essential rows were found
    if (
      headerRowIndex === -1 ||
      laborHeaderIndex === -1 ||
      finalCalcHeaderRowIndex === -1 ||
      finalCalcValueRowIndex === -1
    ) {
      throw new Error(
        "Could not find all required section headers/rows (Ingredients, No. Workers, Final Calculations) in the Pies sheet."
      );
    } // Mini sections might be optional, so don't throw error if not found yet.

    // Process column by column
    const nonRecipeColumnHeaders = [
      "ingredients",
      "quantity(kg)",
      "price",
      "total",
    ]; // Lowercase list to skip
    for (let C = 1; C <= maxCols; C++) {
      // --- CORRECTED PIE HEADER CELL READ ---
      // Read the pie name from Row 1 (index 0), NOT headerRowIndex (Row 4)
      const pieHeaderCell = getCellValue(recipesSheet, 0, C); // Get value from Row 1 (index 0)
      const pieHeader = pieHeaderCell?.toString().trim();

      // Skip empty columns or known non-recipe columns
      if (
        !pieHeader ||
        nonRecipeColumnHeaders.includes(pieHeader.toLowerCase())
      ) {
        logger.debug(
          `Skipping column ${
            C + 1
          } due to empty or non-recipe header: "${pieHeader}"`
        );
        continue;
      }

      logger.info(`--- Processing Column ${C + 1}: Header "${pieHeader}" ---`);

      // Determine if this is Standard or Mini based on which calc section it falls under
      // AND the header name itself (e.g., if it contains "Mini")
      // This assumes Mini pies start AFTER the Standard pies in columns
      let isMini = false;
      let effectiveValueRowIndex = finalCalcValueRowIndex;
      let effectiveMarkupHeaderRowIndex = finalCalcHeaderRowIndex; // Where the markup % text is
      let variantName = "Standard";

      // Check if the Mini section exists and if this column is likely part of it
      if (miniCalcHeaderRowIndex !== -1 && miniCalcValueRowIndex !== -1) {
        // Simple heuristic: If the header *looks* like a mini header (e.g., contains 'Mini')
        // OR if the *standard* calculations for this column seem empty/invalid, assume Mini
        // A more robust approach might involve looking for a clear separator column or row
        const stdBatchSize = parseNumber(
          getCellValue(recipesSheet, finalCalcValueRowIndex, C)
        );
        if (pieHeader.toLowerCase().includes("mini") || stdBatchSize <= 0) {
          isMini = true;
          effectiveValueRowIndex = miniCalcValueRowIndex;
          effectiveMarkupHeaderRowIndex = miniCalcHeaderRowIndex;
          variantName = "Mini";
          logger.info(
            `   Identified as MINI variant based on header or missing Standard batch size.`
          );
        }
      }

      // Extract Base Pie Name (remove 'Mini' if present)
      const basePieName = pieHeader.replace(/\s*-\s*Mini$/i, "").trim(); // Remove ' - Mini' suffix case-insensitively
      logger.info(
        `   Base Pie Name: "${basePieName}", Variant: "${variantName}"`
      );

      // Initialize data structure for this pie column
      currentPieData = {
        header: pieHeader,
        basePieName: basePieName,
        variant: variantName,
        batchSize: 0,
        ingredients: [],
        laborInputs: [],
        laborHourlyRate: 0,
        markupPercentage: 0,
      };

      // --- Extract Batch Size (from the identified Value Row) ---
      const batchSizeCell = getCellValue(
        recipesSheet,
        effectiveValueRowIndex,
        C
      );
      currentPieData.batchSize = parseNumber(batchSizeCell);
      if (currentPieData.batchSize <= 0) {
        logger.warn(
          `   Invalid or zero Batch Size found for "${pieHeader}" in row ${
            effectiveValueRowIndex + 1
          }, Col ${C + 1}. Value: '${batchSizeCell}'. Skipping this column.`
        );
        currentPieData = null; // Reset to skip saving
        continue;
      }
      logger.info(`   Extracted Batch Size: ${currentPieData.batchSize}`);

      // --- Extract Markup Percentage ---
      // The markup % is typically in the header row of the 'Final Calculations' section,
      // shifted 4 columns to the right of the pie name column.
      const markupColumnIndex = C + 4;
      const markupCellAddress = xlsx.utils.encode_cell({
        r: effectiveValueRowIndex,
        c: markupColumnIndex,
      });
      const markupCell = recipesSheet[markupCellAddress]; // Use direct access
      const rawMarkupValue = markupCell ? markupCell.v : undefined; // Get the raw value

      logger.debug(
        `   Attempting to read Markup % from cell ${markupCellAddress} (Row ${
          effectiveValueRowIndex + 1
        }, Col ${markupColumnIndex + 1}), Raw Value: ${rawMarkupValue}`
      );

      // Check if the value looks like a percentage (contains '%') before parsing
      if (typeof rawMarkupValue === "string" && rawMarkupValue.includes("%")) {
        // Extract the number part and parse
        const numericMarkup = rawMarkupValue.replace("%", "").trim();
        currentPieData.markupPercentage = parseNumber(numericMarkup) / 100; // Store as decimal
        if (isNaN(currentPieData.markupPercentage)) {
          logger.warn(
            `   Could not parse Markup Percentage from "${rawMarkupValue}" in cell ${markupCellAddress} for "${pieHeader}". Setting to 0.`
          );
          currentPieData.markupPercentage = 0;
        } else {
          logger.info(
            `   Extracted Markup Percentage: ${
              currentPieData.markupPercentage * 100
            }% for "${pieHeader}"`
          );
        }
      } else if (typeof rawMarkupValue === "number") {
        // Assume it's already a decimal representation if it's a number
        currentPieData.markupPercentage = rawMarkupValue;
        logger.info(
          `   Extracted Markup Percentage (as number): ${
            currentPieData.markupPercentage * 100
          }% for "${pieHeader}"`
        );
      } else {
        logger.warn(
          `   Markup Percentage in cell ${markupCellAddress} for "${pieHeader}" is not a recognizable percentage string or number: "${rawMarkupValue}". Setting to 0.`
        );
        currentPieData.markupPercentage = 0;
      }

      // --- Extract Ingredients ---
      let ingredientRow = ingredientStartIndex;
      logger.debug(
        `   Starting ingredient extraction loop: StartRow=${
          ingredientRow + 1
        }, EndBeforeRow=${laborHeaderIndex + 1}, Column=${C + 1}`
      ); // Log Pie column
      while (ingredientRow < laborHeaderIndex) {
        // Ingredient name from Col A (mostly for reference/stopping)
        const generalIngredientName = getCellValue(
          recipesSheet,
          ingredientRow,
          0
        )
          ?.toString()
          .trim()
          .toLowerCase();

        // Specific Ingredient Name for THIS pie recipe from Column C
        const specificIngredientNameCell = getCellValue(
          recipesSheet,
          ingredientRow,
          C
        );
        const specificIngredientName = specificIngredientNameCell
          ?.toString()
          .trim();

        // Quantity for the specific ingredient from Column C+2 (as per user feedback)
        const quantityCell = getCellValue(recipesSheet, ingredientRow, C + 2); // MODIFIED: C + 2
        const quantity = parseNumber(quantityCell);

        // Update Debug Log to show correct column index read
        logger.debug(
          `      -> Row ${
            ingredientRow + 1
          }: ColA="${generalIngredientName}", SpecificName Col C="${specificIngredientName}", Qty Col C+2="${quantityCell}", ParsedQty=${quantity}`
        );

        // Stop loop if we hit the end of ingredients based on Col A
        if (!generalIngredientName || generalIngredientName.includes("total")) {
          logger.debug(
            `      -> Stopping ingredient loop at Row ${
              ingredientRow + 1
            } based on Col A.`
          );
          break;
        }

        // Process if we have a specific ingredient name and a valid quantity
        if (specificIngredientName && quantity > 0) {
          const lowerCaseSpecificName = specificIngredientName.toLowerCase();
          // Apply variations based on the SPECIFIC name found in the column
          const mappedName =
            ingredientNameVariations[lowerCaseSpecificName] ||
            lowerCaseSpecificName;
          logger.debug(
            `         MappedName="${mappedName}" (Original Specific="${specificIngredientName}")`
          );
          const ingredientId = ingredientMap.get(mappedName);
          logger.debug(
            `         IngredientMap Lookup Result (ID): ${
              ingredientId ? ingredientId : "Not Found"
            }`
          );
          if (ingredientId) {
            try {
              const canonicalIngredient = await Ingredient.findById(
                ingredientId
              );
              if (!canonicalIngredient) {
                logger.warn(
                  `   Ingredient mapping found for "${specificIngredientName}" -> "${mappedName}" but Ingredient document not found with ID: ${ingredientId}. Skipping.`
                );
              } else {
                currentPieData.ingredients.push({
                  ingredient: ingredientId,
                  quantity: quantity,
                  unit: canonicalIngredient.unit,
                });
                logger.debug(
                  `   +++ Added Ingredient: ${specificIngredientName} (${mappedName}) - Qty: ${quantity} ${canonicalIngredient.unit}`
                );
              }
            } catch (dbError) {
              logger.error(
                `   Database error looking up ingredient with ID ${ingredientId}: ${dbError.message}`
              );
            }
          } else {
            logger.warn(
              `   --- Ingredient ID not found for specific name "${specificIngredientName}" (mapped to "${mappedName}") in ingredientMap. Skipping.`
            );
          }
        }
        ingredientRow++;
      }
      logger.info(
        `   Extracted ${currentPieData.ingredients.length} ingredients for ${currentPieData.header}.`
      );

      // --- Extract Labor Inputs ---
      let laborRow = laborHeaderIndex + 1; // Start below 'No. Workers'
      const laborInputEndRow = finalCalcHeaderRowIndex; // Stop before 'Final Calculations'
      while (laborRow < laborInputEndRow) {
        const workersCell = getCellValue(recipesSheet, laborRow, 0); // Workers in Col A
        const hoursTextCell =
          recipesSheet[xlsx.utils.encode_cell({ r: laborRow, c: C })]; // Hours in CURRENT column C - get formatted text
        const hoursText = hoursTextCell ? hoursTextCell.w : undefined; // Use .w for formatted text

        const workers = parseNumber(workersCell);
        const hoursPerWorker = parseNumber(hoursText); // Use formatted text

        const cellValueA_Check = getCellValue(recipesSheet, laborRow, 0)
          ?.toString()
          .trim()
          .toLowerCase();
        if (
          !cellValueA_Check ||
          cellValueA_Check.includes("total") ||
          cellValueA_Check.includes("final") ||
          cellValueA_Check === ""
        ) {
          // Check if we've hit the end of the labor section based on Col A indicators
          logger.debug(
            `   Ending labor extraction at row ${
              laborRow + 1
            } based on Col A content.`
          );
          break;
        }

        if (workers > 0 && hoursPerWorker > 0) {
          currentPieData.laborInputs.push({ workers, hoursPerWorker });
          logger.debug(
            `   Added labor input: ${workers} worker(s) x ${hoursPerWorker} hrs (from row ${
              laborRow + 1
            }, Col C, text='${hoursText}')`
          );
        } else if (workersCell || hoursText) {
          // Log if either cell had *some* value but parsing failed
          logger.warn(
            `   Invalid labor entry found at row ${
              laborRow + 1
            } in Cols A/C. Workers: '${workersCell}', Hours Text: '${hoursText}'. Skipping.`
          );
        }
        laborRow++;
        if (laborRow >= laborInputEndRow) break;
      }
      logger.info(
        `   Extracted ${currentPieData.laborInputs.length} labor inputs for ${currentPieData.header}.`
      );

      // --- Get Labor Hourly Rate ---
      // --- DEBUG: Log basePieName before lookup ---
      logger.debug(
        `   Looking up labor rate for basePieName: "${currentPieData.basePieName}"`
      );
      // --- END DEBUG ---
      const hourlyRate = laborRateMap.get(currentPieData.basePieName);
      if (!hourlyRate) {
        logger.warn(
          `Hourly labor rate not found for base pie name "${currentPieData.basePieName}" (from header "${currentPieData.header}"). Cannot process recipe. Skipping.`
        );
        currentPieData = null;
        continue;
      }
      currentPieData.laborHourlyRate = hourlyRate;
      logger.info(
        `   Using labor rate: ${hourlyRate} for ${currentPieData.basePieName}.`
      );

      // --- Create/Update Recipe Document ---
      try {
        const recipeData = {
          pieName: currentPieData.basePieName,
          variant: currentPieData.variant,
          batchSize: currentPieData.batchSize,
          ingredients: currentPieData.ingredients,
          laborInputs: currentPieData.laborInputs,
          laborHourlyRate: currentPieData.laborHourlyRate,
          markupPercentage: currentPieData.markupPercentage,
        };
        const recipe = new Recipe(recipeData);
        await recipe.updateCalculatedCostsAndPrice();
        logger.info(
          `   Calculated Costs for ${recipe.pieName} - ${recipe.variant}: Cost/Pie=${recipe.calculatedCosts.costPerPie}, Selling Price=${recipe.sellingPrice}`
        );

        const updateData = recipe.toObject({ virtuals: false });
        delete updateData._id;

        await Recipe.findOneAndUpdate(
          { pieName: recipe.pieName, variant: recipe.variant },
          { $set: updateData },
          {
            upsert: true,
            new: true,
            runValidators: true,
            setDefaultsOnInsert: true,
          }
        );
        logger.info(
          `   Successfully upserted recipe: "${recipe.pieName} - ${recipe.variant}"`
        );
        recipesProcessed++;
      } catch (error) {
        logger.error(
          `Failed to process or save recipe "${
            currentPieData?.header || "Unknown Recipe Header"
          }": ${error.message}`
        );
        if (error.stack) {
          logger.error(error.stack);
        }
      }
      currentPieData = null; // Reset for next column
    } // End loop over columns

    logger.info(
      `Processed ${recipesProcessed} recipes from sheet "${RECIPES_SHEET}".`
    );

    logger.info("Data migration completed successfully!");
  } catch (error) {
    logger.error("Data migration failed:", error);
    migrationError = error; // Store the error if one occurs
    if (error.stack) {
      // Log stack trace for migration errors too
      logger.error(error.stack);
    }
  } finally {
    // 4. Disconnect from Database
    logger.info("Disconnecting from database...");
    try {
      await mongoose.disconnect();
      logger.info("Database disconnected.");
    } catch (disconnectError) {
      logger.error(
        `Error disconnecting from database: ${disconnectError.message}`
      );
      if (!migrationError) {
        migrationError = disconnectError;
      }
    }
    // Use the tracked error flag to set the exit code
    if (migrationError) {
      logger.error("Migration process finished with errors.");
      process.exit(1);
    } else {
      logger.info("Migration process finished successfully.");
      process.exit(0);
    }
  }
};

// Run the migration
migrateData();
