# Coding guidelines 
The following coding guidelines apply to all work done in this repository:

- Follow general coding best practices for Typescript
- Each piece of code must be tested with many unit tests covering all edge cases. We also need integration and end to end tests
- Test belong in a separate tests/ folder
- The test folder structure should be similar to the actual folder structure in the project so it is clear, what code is tested
- Test coverage should be automatically generated during test runs
- Use one testing framework consistently throughout the project
- move reusable test helpers or in general any code that's related to tests but is not the tests themselves, into a desperate place (file or folder)
- test function signatures should follow this pattern: test_Given_When_Then where Given, When and Then aren't written but instead placeholders for the tested piece of code (Given), e.g. a function, the input (When) and the expected output / behaviour (Then); all in PascalCase. 
- prefer longer, descriptive test function names and make sure that it's clear what each test function tests
- Prefer small functions with one clear responsibility over large ones in general. This also applies to classes, etc.
- Don't create very large files. Split up files into multiple smaller ones if needed
- one file should only contain code for the same topic (for example Auth). If one file gets to large, convert it to a folder and create new files in this folder (folder structure that's given from issues or other documents has higher priority then this principle)
- Do not use decorative comments. Only use comments where code is not self explanatory. Prefer shorter comments over long ones
