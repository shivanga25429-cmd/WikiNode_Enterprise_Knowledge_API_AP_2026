-- Re-runnable demonstration content. Only inserts missing seed categories and
-- articles, and leaves existing administrator-created records untouched.
INSERT INTO wikinode.categories (name, description)
VALUES
  ('HR', 'Human resources policies and employee guidance'),
  ('IT', 'Technical support and account security procedures'),
  ('Finance', 'Expense claims and reimbursement guidance')
ON CONFLICT (name) DO NOTHING;

INSERT INTO wikinode.articles (category_id, title, content)
SELECT c.category_id, s.title, s.content
FROM (VALUES
  ('HR', 'Annual Leave Policy',
   'Employees request annual leave from their manager. Submit the request before the planned dates and wait for approval.'),
  ('IT', 'Resetting Your Corporate Password',
   'Open the company password reset portal, verify your identity, and choose a strong password. Contact IT if your account is locked.'),
  ('Finance', 'Client Dinner Reimbursement',
   'Save the itemized receipt, document the business purpose, and submit an expense claim to Finance for approval.')
) AS s(category_name, title, content)
JOIN wikinode.categories c ON c.name = s.category_name
WHERE NOT EXISTS (
  SELECT 1
  FROM wikinode.articles a
  WHERE a.category_id = c.category_id AND a.title = s.title
);
