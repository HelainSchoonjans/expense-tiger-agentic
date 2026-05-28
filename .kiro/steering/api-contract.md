---
inclusion: fileMatch
fileMatchPattern: '**/lambda/**,**/frontend/js/api.js,**/frontend/js/receipt-uploader.js,**/frontend/js/expense-editor.js,**/frontend/js/expense-list.js'
---

# API Wire Format Contract

The API uses snake_case field names on the wire (HTTP request/response bodies).

- Frontend sends snake_case (api.js `_toSnakeCase` converts camelCase → snake_case before sending)
- Frontend receives snake_case (api.js `_toCamelCase` converts snake_case → camelCase after receiving)
- Backend Lambda handlers receive and return snake_case field names
- DynamoDB stores camelCase (internal storage format, not exposed on the wire)

See the OpenAPI spec: #[[file:.kiro/specs/expense-submission-app/api-contract.yaml]]

Required fields for POST /expenses: `merchant_name`, `date`, `total_amount` (snake_case)
